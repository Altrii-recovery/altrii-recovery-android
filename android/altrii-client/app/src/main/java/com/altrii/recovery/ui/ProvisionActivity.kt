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
