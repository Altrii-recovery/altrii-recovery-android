set -euo pipefail

ANDROID_ROOT="android/altrii-client"
echo "== Creating Android client at $ANDROID_ROOT =="

# --- Gradle settings ---
mkdir -p "$ANDROID_ROOT"
cat > "$ANDROID_ROOT/settings.gradle.kts" <<'EOF'
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
  repositories { google(); mavenCentral() }
}
rootProject.name = "AltriiClient"
include(":app")
EOF

cat > "$ANDROID_ROOT/build.gradle.kts" <<'EOF'
plugins {
  id("com.android.application") version "8.5.2" apply false
  id("org.jetbrains.kotlin.android") version "1.9.24" apply false
}
EOF

cat > "$ANDROID_ROOT/gradle.properties" <<'EOF'
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
kotlin.code.style=official
EOF

# --- App module ---
mkdir -p "$ANDROID_ROOT/app"
cat > "$ANDROID_ROOT/app/build.gradle.kts" <<'EOF'
plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
}

android {
  namespace = "com.altrii.recovery"
  compileSdk = 34

  defaultConfig {
    applicationId = "com.altrii.recovery"
    minSdk = 26
    targetSdk = 34
    versionCode = 1
    versionName = "0.1.0"
  }

  buildTypes {
    release {
      isMinifyEnabled = false
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
  kotlinOptions { jvmTarget = "17" }
}

dependencies {
  implementation("androidx.core:core-ktx:1.13.1")
  implementation("androidx.appcompat:appcompat:1.7.0")
  implementation("com.google.android.material:material:1.12.0")

  // QR scanner
  implementation("com.journeyapps:zxing-android-embedded:4.3.0")
  implementation("com.google.zxing:core:3.5.3")

  // Networking + JSON + coroutines
  implementation("com.squareup.okhttp3:okhttp:4.12.0")
  implementation("org.json:json:20240303")
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}
EOF

# --- Resources (set your backend URL here later in Studio) ---
mkdir -p "$ANDROID_ROOT/app/src/main/res/values"
cat > "$ANDROID_ROOT/app/src/main/res/values/strings.xml" <<'EOF'
<resources>
  <!-- For a real phone, set your Railway URL (e.g., https://your-app.up.railway.app) -->
  <!-- For Android emulator, use http://10.0.2.2:3000 -->
  <string name="altrii_base_url">https://YOUR-RAILWAY-APP-URL</string>
</resources>
EOF

# --- AndroidManifest & components ---
mkdir -p "$ANDROID_ROOT/app/src/main"
cat > "$ANDROID_ROOT/app/src/main/AndroidManifest.xml" <<'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  <uses-permission android:name="android.permission.INTERNET" />

  <application
      android:allowBackup="true"
      android:label="Altrii Client"
      android:supportsRtl="true"
      android:theme="@style/Theme.Material3.DayNight.NoActionBar">

    <activity
        android:name=".ui.ProvisionActivity"
        android:exported="true">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
    </activity>

    <service
        android:name=".core.service.KeeperService"
        android:exported="false"
        android:foregroundServiceType="dataSync" />

    <receiver
        android:name=".core.boot.BootReceiver"
        android:enabled="true"
        android:exported="false">
      <intent-filter>
        <action android:name="android.intent.action.BOOT_COMPLETED"/>
      </intent-filter>
    </receiver>

    <service
        android:name=".vpn.AltriiVpnService"
        android:permission="android.permission.BIND_VPN_SERVICE"
        android:exported="true" />
  </application>
</manifest>
EOF

# --- Kotlin sources ---
SRC="$ANDROID_ROOT/app/src/main/java/com/altrii/recovery"
mkdir -p "$SRC/core/store" "$SRC/core/service" "$SRC/core/boot" "$SRC/vpn" "$SRC/ui"

cat > "$SRC/core/store/Prefs.kt" <<'EOF'
package com.altrii.recovery.core.store

import android.content.Context

object Prefs {
    private const val NAME = "altrii"
    private const val KEY_DEVICE_ID = "device_id"
    private const val KEY_PROVISION_TOKEN = "provision_token"
    private const val KEY_LOCK_TOKEN = "lock_token"
    private const val KEY_LOCK_UNTIL = "lock_until"

    private fun sp(ctx: Context) = ctx.getSharedPreferences(NAME, Context.MODE_PRIVATE)

    fun saveProvision(ctx: Context, deviceId: String, token: String) {
        sp(ctx).edit().putString(KEY_DEVICE_ID, deviceId)
            .putString(KEY_PROVISION_TOKEN, token)
            .apply()
    }

    fun getDeviceId(ctx: Context) = sp(ctx).getString(KEY_DEVICE_ID, null)
    fun getProvisionToken(ctx: Context) = sp(ctx).getString(KEY_PROVISION_TOKEN, null)

    fun saveLock(ctx: Context, token: String, lockUntilEpochMillis: Long) {
        sp(ctx).edit().putString(KEY_LOCK_TOKEN, token)
            .putLong(KEY_LOCK_UNTIL, lockUntilEpochMillis)
            .apply()
    }

    fun getLockToken(ctx: Context) = sp(ctx).getString(KEY_LOCK_TOKEN, null)
    fun getLockUntil(ctx: Context) = sp(ctx).getLong(KEY_LOCK_UNTIL, 0L)
}
EOF

cat > "$SRC/core/service/KeeperService.kt" <<'EOF'
package com.altrii.recovery.core.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.altrii.recovery.vpn.AltriiVpnService

class KeeperService : Service() {
    override fun onCreate() {
        super.onCreate()
        createChannel()
        val notif = NotificationCompat.Builder(this, CHANNEL)
            .setContentTitle("Altrii Recovery")
            .setContentText("Protection standby")
            .setSmallIcon(android.R.drawable.stat_sys_vpn_ic)
            .setOngoing(true)
            .build()
        startForeground(NOTIF_ID, notif)
        startService(Intent(this, AltriiVpnService::class.java))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY
    override fun onBind(intent: Intent?) = null

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val mgr = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            mgr.createNotificationChannel(
                NotificationChannel(CHANNEL, "Altrii", NotificationManager.IMPORTANCE_LOW)
            )
        }
    }
    companion object {
        private const val CHANNEL = "altrii_core"
        private const val NOTIF_ID = 101
    }
}
EOF

cat > "$SRC/core/boot/BootReceiver.kt" <<'EOF'
package com.altrii.recovery.core.boot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.altrii.recovery.core.service.KeeperService

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        context.startForegroundService(Intent(context, KeeperService::class.java))
    }
}
EOF

cat > "$SRC/vpn/AltriiVpnService.kt" <<'EOF'
package com.altrii.recovery.vpn

import android.net.VpnService
import android.os.ParcelFileDescriptor
import kotlinx.coroutines.*
import java.io.FileInputStream
import java.io.FileOutputStream

class AltriiVpnService : VpnService() {
    private var iface: ParcelFileDescriptor? = null
    private var job: Job? = null

    override fun onStartCommand(intent: android.content.Intent?, flags: Int, startId: Int): Int {
        startTunnel(); return START_STICKY
    }
    override fun onDestroy() { job?.cancel(); iface?.close(); super.onDestroy() }

    private fun startTunnel() {
        if (iface != null) return
        iface = Builder().setSession("Altrii Recovery")
            .addAddress("10.0.0.2", 32)
            .addDnsServer("1.1.1.1")
            .addRoute("0.0.0.0", 0)
            .establish()

        job = CoroutineScope(Dispatchers.IO).launch {
            iface?.let {
                val input = FileInputStream(it.fileDescriptor)
                val output = FileOutputStream(it.fileDescriptor)
                val buf = ByteArray(32767)
                while (isActive) {
                    val n = input.read(buf)
                    if (n > 0) output.write(buf, 0, n) // echo/no-op
                }
            }
        }
    }
}
EOF

cat > "$SRC/ui/ProvisionActivity.kt" <<'EOF'
package com.altrii.recovery.ui

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import com.altrii.recovery.R
import com.altrii.recovery.core.service.KeeperService
import com.altrii.recovery.core.store.Prefs
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.util.UUID
import kotlin.concurrent.thread

class ProvisionActivity : Activity() {

    private val scanner = registerForActivityResult(ScanContract()) { result ->
        val tv = findViewById<TextView>(android.R.id.text1)
        if (result == null || result.contents == null) {
            tv.text = "Scan cancelled"
            return@registerForActivityResult
        }
        try {
            val obj = JSONObject(result.contents)
            val token =
                obj.optString("token", null)
                ?: JSONObject(obj.optString("qrPayload", "{}")).optString("token", null)
                ?: if (obj.optString("scheme") == "altrii://provision") obj.optString("token", null) else null

            val deviceId = UUID.randomUUID().toString() // stateless mode
            if (token != null) {
                Prefs.saveProvision(this, deviceId, token)
                tv.text = "Provisioned ✓\nDevice: $deviceId"
                requestVpnConsentAndStart()
                updateStatus()
            } else {
                tv.text = "QR missing token"
            }
        } catch (e: Exception) {
            tv.text = "Error: ${e.message}"
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val tv = TextView(this).apply { id = android.R.id.text1; textSize = 16f; text = "Tap Scan to provision." }
        val scanBtn = Button(this).apply { text = "Scan QR"; setOnClickListener { launchScanner() } }
        val lockBtn = Button(this).apply { text = "Lock for 60 mins"; setOnClickListener { requestLock(60) } }

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 64, 32, 32)
            addView(tv); addView(scanBtn); addView(lockBtn)
        }
        setContentView(root)

        updateStatus()
    }

    private fun launchScanner() {
        val opts = ScanOptions().setDesiredBarcodeFormats(ScanOptions.QR_CODE).setPrompt("Scan Altrii QR")
        scanner.launch(opts)
    }

    private fun requestVpnConsentAndStart() {
        val intent = VpnService.prepare(this)
        if (intent != null) startActivityForResult(intent, REQ_VPN) else onActivityResult(REQ_VPN, RESULT_OK, null)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQ_VPN && resultCode == RESULT_OK) {
            startForegroundService(Intent(this, KeeperService::class.java))
            Toast.makeText(this, "VPN permission granted", Toast.LENGTH_SHORT).show()
        }
    }

    private fun requestLock(minutes: Int) {
        val deviceId = Prefs.getDeviceId(this) ?: run {
            Toast.makeText(this, "Provision first (Scan QR)", Toast.LENGTH_SHORT).show()
            return
        }
        val payload = JSONObject().put("durationMinutes", minutes).put("reason", "test").toString()

        thread {
            try {
                val base = getString(R.string.altrii_base_url).trimEnd('/')
                val url = URL("$base/api/devices/$deviceId/lock")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    setRequestProperty("Content-Type", "application/json")
                    doOutput = true
                    outputStream.use { it.write(payload.toByteArray()) }
                }
                val resp = conn.inputStream.bufferedReader().readText()
                val obj = JSONObject(resp)
                val lockToken = obj.getString("token")
                val lockUntilIso = obj.getString("lockUntil")
                val untilMillis = Instant.parse(lockUntilIso).toEpochMilli()
                Prefs.saveLock(this, lockToken, untilMillis)
                runOnUiThread {
                    Toast.makeText(this, "Locked until $lockUntilIso", Toast.LENGTH_LONG).show()
                    updateStatus()
                }
            } catch (e: Exception) {
                runOnUiThread { Toast.makeText(this, "Lock failed: ${e.message}", Toast.LENGTH_LONG).show() }
            }
        }
    }

    private fun updateStatus() {
        val tv = findViewById<TextView>(android.R.id.text1) ?: return
        val devId = Prefs.getDeviceId(this)
        val until = Prefs.getLockUntil(this)
        val sb = StringBuilder()
        if (devId != null) sb.append("Device: ").append(devId).append('\n') else sb.append("Not provisioned\n")
        if (until > 0) sb.append("Locked until: ").append(Instant.ofEpochMilli(until).toString()) else sb.append("Not locked")
        tv.text = sb.toString()
    }

    companion object { private const val REQ_VPN = 1001 }
}
EOF

echo "== Android client stub created at $ANDROID_ROOT =="
echo "Next: open this folder in Android Studio."
