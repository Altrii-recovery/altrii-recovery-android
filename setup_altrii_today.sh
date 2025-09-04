set -euo pipefail

echo "== Checking repo structure =="
test -d apps/web || { echo "ERROR: apps/web not found. Run this from your repo root (/workspaces/altrii-recovery-android)."; exit 1; }
test -f pnpm-workspace.yaml || echo "Warning: pnpm-workspace.yaml not found (continuing)."

echo "== Creating web API routes, QR page, and JWT helper =="

mkdir -p apps/web/app/api/provision
mkdir -p apps/web/app/api/devices/[id]/rules
mkdir -p apps/web/app/api/devices/[id]/lock
mkdir -p apps/web/app/dashboard/provision
mkdir -p apps/web/lib

# POST /api/provision
cat > apps/web/app/api/provision/route.ts <<'EOF'
import { NextResponse } from "next/server";
import { z } from "zod";
import { signProvisioningToken } from "@/lib/jwt";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const Body = z.object({
  deviceSerial: z.string().optional(),
  model: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const device = await prisma.device.upsert({
    where: { ownerId_serial: { ownerId: session.user.id, serial: body.data.deviceSerial ?? "unknown" } },
    update: { model: body.data.model ?? undefined },
    create: { ownerId: session.user.id, serial: body.data.deviceSerial ?? "unknown", model: body.data.model ?? null },
    select: { id: true },
  });

  const token = await signProvisioningToken({
    deviceId: device.id,
    ownerId: session.user.id,
    aud: "altrii-device",
    expSeconds: 10 * 60,
  });

  const qrPayload = JSON.stringify({ scheme: "altrii://provision", token });
  return NextResponse.json({ token, qrPayload });
}
EOF

# GET /api/devices/[id]/rules
cat > apps/web/app/api/devices/[id]/rules/route.ts <<'EOF'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface Params { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
  const id = params.id;
  const ruleSet = await prisma.deviceRuleSet.findFirst({ where: { deviceId: id } });
  const payload = {
    version: ruleSet?.version ?? 1,
    updatedAt: new Date().toISOString(),
    categories: { porn: true, gambling: true, social: true, youtube: true },
    blocklists: { domains: ["example-bad-site.com"], sni: ["bad.example"], ip: [] },
  };
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
EOF

# POST /api/devices/[id]/lock
cat > apps/web/app/api/devices/[id]/lock/route.ts <<'EOF'
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signLockToken } from "@/lib/jwt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const Body = z.object({
  lockUntil: z.string().datetime().optional(),
  durationMinutes: z.number().int().positive().max(7 * 24 * 60).optional(),
  reason: z.string().optional(),
});

interface Params { params: { id: string } }

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const deviceId = params.id;
  const now = new Date();
  const until = body.data.lockUntil ? new Date(body.data.lockUntil)
    : new Date(now.getTime() + (body.data.durationMinutes ?? 60) * 60 * 1000);

  const token = await signLockToken({
    deviceId,
    ownerId: session.user.id,
    aud: "altrii-device",
    lockUntil: Math.floor(until.getTime() / 1000),
    issuedAtServer: Math.floor(now.getTime() / 1000),
  });

  await prisma.lock.create({
    data: { deviceId, ownerId: session.user.id, lockUntil: until, reason: body.data.reason ?? null, token },
  });

  return NextResponse.json({ token, lockUntil: until.toISOString() });
}
EOF

# lib/jwt.ts
cat > apps/web/lib/jwt.ts <<'EOF'
import { SignJWT, jwtVerify } from "jose";

const ALG = "HS256";
const ISS = process.env.JWT_ISSUER ?? "altrii";
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "change-me");

type BaseClaims = { deviceId: string; ownerId: string; aud: string; };

export async function signProvisioningToken(input: BaseClaims & { expSeconds: number }) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ typ: "provision" })
    .setProtectedHeader({ alg: ALG })
    .setIssuer(ISS).setAudience(input.aud).setSubject(input.deviceId)
    .setIssuedAt(now).setExpirationTime(now + input.expSeconds)
    .setJti(`${input.ownerId}:${input.deviceId}:${now}`)
    .sign(SECRET);
}

export async function signLockToken(input: BaseClaims & { lockUntil: number, issuedAtServer: number }) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ typ: "lock", lockUntil: input.lockUntil, issuedAtServer: input.issuedAtServer })
    .setProtectedHeader({ alg: ALG })
    .setIssuer(ISS).setAudience(input.aud).setSubject(input.deviceId)
    .setIssuedAt(now).setExpirationTime(input.lockUntil + 300)
    .setJti(`${input.ownerId}:${input.deviceId}:${now}`)
    .sign(SECRET);
}

export async function verifyToken<T = any>(token: string) {
  const { payload } = await jwtVerify(token, SECRET, { issuer: ISS });
  return payload as T;
}
EOF

# Dashboard QR page
cat > apps/web/app/dashboard/provision/page.tsx <<'EOF'
'use client';
import { useState } from 'react';
import QRCode from 'qrcode';

export default function ProvisionPage() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/provision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create token');
      const payload = json.qrPayload || JSON.stringify({ scheme: 'altrii://provision', token: json.token });
      const url = await QRCode.toDataURL(payload);
      setDataUrl(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">Provision a Device</h1>
      <p className="text-sm opacity-80 mb-4">Generate a QR code to enroll an Android device.</p>
      <button onClick={generate} disabled={loading} className="px-4 py-2 rounded bg-black text-white">
        {loading ? 'Generating…' : 'Generate QR'}
      </button>
      {error && <p className="text-red-600 mt-3">{error}</p>}
      {dataUrl && (<div className="mt-6"><img src={dataUrl} alt="Provisioning QR" className="border rounded" /></div>)}
    </div>
  );
}
EOF

echo "== Appending Prisma models (if not present) =="
SCHEMA="apps/web/prisma/schema.prisma"
test -f "$SCHEMA" || { echo "ERROR: $SCHEMA not found."; exit 1; }

if ! grep -q "model Device" "$SCHEMA"; then
cat >> "$SCHEMA" <<'EOF'

// --- Added by setup script ---
model Device {
  id         String   @id @default(cuid())
  ownerId    String
  serial     String
  model      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  locks      Lock[]
  rules      DeviceRuleSet[]

  @@unique([ownerId, serial], name: "ownerId_serial")
}

model Lock {
  id         String   @id @default(cuid())
  deviceId   String
  ownerId    String
  lockUntil  DateTime
  reason     String?
  token      String
  createdAt  DateTime @default(now())

  device     Device   @relation(fields: [deviceId], references: [id])
}

model DeviceRuleSet {
  id        String   @id @default(cuid())
  deviceId  String
  version   Int      @default(1)
  json      Json
  createdAt DateTime @default(now())

  device    Device   @relation(fields: [deviceId], references: [id])
}
EOF
else
  echo "Prisma models seem to exist already — skipping append."
fi

echo "== Setting env vars =="
touch apps/web/.env.local
grep -q '^JWT_SECRET=' apps/web/.env.local || echo 'JWT_SECRET=please-change-me' >> apps/web/.env.local
grep -q '^JWT_ISSUER=' apps/web/.env.local || echo 'JWT_ISSUER=altrii' >> apps/web/.env.local

echo "== Installing packages (jose, qrcode, zod) =="
pnpm add -w jose qrcode zod

echo "== Prisma generate & migrate =="
pnpm dlx prisma generate --schema=apps/web/prisma/schema.prisma
pnpm dlx prisma migrate dev --schema=apps/web/prisma/schema.prisma -n add_device_and_lock_models

echo "== (Optional) Android skeleton =="
read -r -p "Create Android skeleton now? [y/N]: " REPLY_ANDROID
if [[ "${REPLY_ANDROID,,}" == "y" ]]; then
  BASE=android/altrii-recovery-android
  mkdir -p "$BASE"/{core/src/main/java/com/altrii/recovery/core/{jwt,net,store,service,boot},vpn/src/main/java/com/altrii/recovery/vpn,admin/src/main/java/com/altrii/recovery/admin,admin/src/main/res/xml}
  # Settings & root gradle
  cat > "$BASE/settings.gradle.kts" <<'EOF'
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
  repositories { google(); mavenCentral() }
}
rootProject.name = "AltriiRecovery"
include(":core", ":vpn", ":admin")
EOF
  cat > "$BASE/build.gradle.kts" <<'EOF'
plugins {
  id("com.android.application") version "8.5.2" apply false
  id("com.android.library") version "8.5.2" apply false
  id("org.jetbrains.kotlin.android") version "1.9.24" apply false
}
allprojects {
  tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile::class.java).configureEach {
    kotlinOptions { jvmTarget = "17" }
  }
}
EOF
  cat > "$BASE/gradle.properties" <<'EOF'
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
kotlin.code.style=official
EOF
  # core module
  mkdir -p "$BASE/core"
  cat > "$BASE/core/build.gradle.kts" <<'EOF'
plugins { id("com.android.library"); id("org.jetbrains.kotlin.android") }
android {
  namespace = "com.altrii.recovery.core"; compileSdk = 34
  defaultConfig { minSdk = 26; targetSdk = 34; testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"; consumerProguardFiles("consumer-rules.pro") }
  buildTypes { release { isMinifyEnabled = false; proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro") } }
  buildFeatures { buildConfig = true }
}
dependencies {
  implementation("androidx.core:core-ktx:1.13.1")
  implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")
  implementation("com.squareup.okhttp3:okhttp:4.12.0")
  implementation("com.google.code.gson:gson:2.11.0")
  implementation("androidx.security:security-crypto:1.1.0-alpha06")
}
EOF
  cat > "$BASE/core/src/main/AndroidManifest.xml" <<'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:allowBackup="false" android:supportsRtl="true" />
</manifest>
EOF
  cat > "$BASE/core/src/main/java/com/altrii/recovery/core/jwt/JwtHS256.kt" <<'EOF'
package com.altrii.recovery.core.jwt
import android.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
object JwtHS256 {
  fun sign(payload: String, secret: String): String {
    val header = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}"
    val body = "${b64(header.toByteArray())}.${b64(payload.toByteArray())}"
    val sig = hmacSha256(body, secret)
    return "$body.$sig"
  }
  fun verify(token: String, secret: String): Boolean {
    val p = token.split("."); if (p.size != 3) return false
    val expected = hmacSha256(p[0]+"."+p[1], secret)
    return constEq(p[2], expected)
  }
  private fun hmacSha256(data: String, secret: String): String {
    val mac = Mac.getInstance("HmacSHA256")
    mac.init(SecretKeySpec(secret.toByteArray(), "HmacSHA256"))
    return b64(mac.doFinal(data.toByteArray()))
  }
  private fun b64(b: ByteArray) = Base64.encodeToString(b, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
  private fun constEq(a: String, b: String): Boolean { if (a.length != b.length) return false; var r=0; for (i in a.indices) r = r or (a[i].code xor b[i].code); return r==0 }
}
EOF
  cat > "$BASE/core/src/main/java/com/altrii/recovery/core/net/Api.kt" <<'EOF'
package com.altrii.recovery.core.net
import okhttp3.*; import java.util.concurrent.TimeUnit
object Api {
  private var client = OkHttpClient.Builder().callTimeout(30, TimeUnit.SECONDS).build()
  var baseUrl: String = "https://app.altrii.co"
  fun post(path: String, json: String) = client.newCall(Request.Builder().url(baseUrl+path).post(RequestBody.create(MediaType.parse("application/json"), json)).build()).execute()
  fun get(path: String) = client.newCall(Request.Builder().url(baseUrl+path).get().build()).execute()
}
EOF
  cat > "$BASE/core/src/main/java/com/altrii/recovery/core/store/KV.kt" <<'EOF'
package com.altrii.recovery.core.store
import android.content.Context; import android.content.SharedPreferences
object KV { private const val NAME="altrii_core"; fun prefs(ctx: Context): SharedPreferences = ctx.getSharedPreferences(NAME, Context.MODE_PRIVATE) }
EOF
  cat > "$BASE/core/src/main/java/com/altrii/recovery/core/service/KeeperService.kt" <<'EOF'
package com.altrii.recovery.core.service
import android.app.*; import android.content.Context; import android.content.Intent; import android.os.Build
import androidx.core.app.NotificationCompat
import com.altrii.recovery.vpn.AltriiVpnService
class KeeperService : Service() {
  override fun onCreate() {
    super.onCreate(); if (Build.VERSION.SDK_INT>=Build.VERSION_CODES.O) {
      val chan = NotificationChannel("altrii_core","Altrii", NotificationManager.IMPORTANCE_LOW)
      (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(chan)
    }
    val notif = NotificationCompat.Builder(this,"altrii_core").setContentTitle("Altrii Recovery").setContentText("Protection is active").setSmallIcon(android.R.drawable.stat_sys_vpn_ic).build()
    startForeground(101, notif)
  }
  override fun onStartCommand(i: Intent?, f: Int, s: Int): Int { startService(Intent(this, AltriiVpnService::class.java)); return START_STICKY }
  override fun onBind(i: Intent?) = null
}
EOF
  cat > "$BASE/core/src/main/java/com/altrii/recovery/core/boot/BootReceiver.kt" <<'EOF'
package com.altrii.recovery.core.boot
import android.content.*; import com.altrii.recovery.core.service.KeeperService
class BootReceiver: BroadcastReceiver(){ override fun onReceive(c: Context, i: Intent){ c.startForegroundService(Intent(c, KeeperService::class.java)) } }
EOF

  # vpn module
  mkdir -p "$BASE/vpn"
  cat > "$BASE/vpn/build.gradle.kts" <<'EOF'
plugins { id("com.android.library"); id("org.jetbrains.kotlin.android") }
android {
  namespace = "com.altrii.recovery.vpn"; compileSdk = 34
  defaultConfig { minSdk = 26; targetSdk = 34; testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"; consumerProguardFiles("consumer-rules.pro") }
  buildTypes { release { isMinifyEnabled = false; proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro") } }
}
dependencies { implementation(project(":core")); implementation("androidx.core:core-ktx:1.13.1") }
EOF
  mkdir -p "$BASE/vpn/src/main"
  cat > "$BASE/vpn/src/main/AndroidManifest.xml" <<'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application />
</manifest>
EOF
  cat > "$BASE/vpn/src/main/java/com/altrii/recovery/vpn/AltriiVpnService.kt" <<'EOF'
package com.altrii.recovery.vpn
import android.net.VpnService; import android.os.ParcelFileDescriptor; import android.util.Log
import kotlinx.coroutines.*; import java.io.FileInputStream; import java.io.FileOutputStream
class AltriiVpnService : VpnService() {
  private var iface: ParcelFileDescriptor? = null
  private var job: Job? = null
  override fun onStartCommand(i: android.content.Intent?, f: Int, s: Int): Int { startTunnel(); return START_STICKY }
  override fun onDestroy() { job?.cancel(); iface?.close(); super.onDestroy() }
  private fun startTunnel() {
    if (iface != null) return
    iface = Builder().setSession("Altrii Recovery").addAddress("10.0.0.2", 32).addDnsServer("1.1.1.1").addRoute("0.0.0.0",0).establish()
    job = CoroutineScope(Dispatchers.IO).launch {
      iface?.let {
        val input = FileInputStream(it.fileDescriptor); val output = FileOutputStream(it.fileDescriptor); val buf = ByteArray(32767)
        while (isActive) { val n = input.read(buf); if (n>0) { /* TODO: DNS/SNI filter */ output.write(buf,0,n) } }
      }
    }
    Log.i("AltriiVpnService","Started")
  }
}
EOF

  # admin module
  mkdir -p "$BASE/admin"
  cat > "$BASE/admin/build.gradle.kts" <<'EOF'
plugins { id("com.android.library"); id("org.jetbrains.kotlin.android") }
android {
  namespace = "com.altrii.recovery.admin"; compileSdk = 34
  defaultConfig { minSdk = 26; targetSdk = 34; testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"; consumerProguardFiles("consumer-rules.pro") }
  buildTypes { release { isMinifyEnabled = false; proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro") } }
}
dependencies { implementation("androidx.core:core-ktx:1.13.1"); implementation("androidx.appcompat:appcompat:1.7.0"); implementation("com.google.android.material:material:1.12.0") }
EOF
  mkdir -p "$BASE/admin/src/main/res/xml"
  cat > "$BASE/admin/src/main/AndroidManifest.xml" <<'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.altrii.recovery.admin">
  <application android:label="Altrii Admin">
    <receiver android:name=".DpcAdminReceiver" android:permission="android.permission.BIND_DEVICE_ADMIN" android:exported="true">
      <meta-data android:name="android.app.device_admin" android:resource="@xml/device_admin_receiver" />
      <intent-filter><action android:name="android.app.action.DEVICE_ADMIN_ENABLED" /></intent-filter>
    </receiver>
    <activity android:name=".ProvisioningActivity" android:exported="true">
      <intent-filter><action android:name="android.app.action.PROVISION_MANAGED_DEVICE"/><category android:name="android.intent.category.DEFAULT"/></intent-filter>
    </activity>
  </application>
</manifest>
EOF
  cat > "$BASE/admin/src/main/res/xml/device_admin_receiver.xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<device-admin xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-policies>
    <limit-password /><watch-login /><reset-password /><wipe-data />
    <force-lock /><expire-password /><encrypted-storage /><disable-camera />
  </uses-policies>
</device-admin>
EOF
  cat > "$BASE/admin/src/main/java/com/altrii/recovery/admin/DpcAdminReceiver.kt" <<'EOF'
package com.altrii.recovery.admin
import android.app.admin.DeviceAdminReceiver; import android.content.*; import android.widget.Toast
class DpcAdminReceiver: DeviceAdminReceiver() {
  override fun onEnabled(c: Context, i: Intent) { Toast.makeText(c,"Altrii admin enabled", Toast.LENGTH_SHORT).show() }
  override fun onDisabled(c: Context, i: Intent) { Toast.makeText(c,"Altrii admin disabled", Toast.LENGTH_SHORT).show() }
}
EOF
  cat > "$BASE/admin/src/main/java/com/altrii/recovery/admin/ProvisioningActivity.kt" <<'EOF'
package com.altrii.recovery.admin
import android.app.Activity; import android.os.Bundle
class ProvisioningActivity: Activity(){ override fun onCreate(savedInstanceState: Bundle?){ super.onCreate(savedInstanceState); finish() } }
EOF
  echo "Android skeleton created at android/altrii-recovery-android"
else
  echo "Skipped Android skeleton (you chose N)."
fi

echo "== ALL DONE =="
echo "Next steps:"
echo "  1) Start web app: cd apps/web && pnpm dev"
echo "  2) Visit /dashboard/provision and click 'Generate QR'"
echo "  3) (Later) Open android/altrii-recovery-android in Android Studio for device work."
