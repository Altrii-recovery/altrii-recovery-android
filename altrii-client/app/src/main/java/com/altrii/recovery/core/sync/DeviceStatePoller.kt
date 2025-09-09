package com.altrii.recovery.core.sync

import android.content.Context
import android.os.Handler
import android.os.Looper
import com.altrii.recovery.admin.DpcPolicy
import com.altrii.recovery.core.store.Prefs
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant

object DeviceStatePoller {
    private var handler: Handler? = null

    fun start(context: Context, intervalMs: Long = 5 * 60 * 1000L) {
        if (handler != null) return
        val h = Handler(Looper.getMainLooper())
        handler = h
        val task = object : Runnable {
            override fun run() {
                try { pollOnce(context) } catch (_: Throwable) {}
                handler?.postDelayed(this, intervalMs)
            }
        }
        h.post(task)
    }

    fun stop() {
        handler?.removeCallbacksAndMessages(null)
        handler = null
    }

    private fun pollOnce(ctx: Context) {
        val devId = Prefs.getDeviceId(ctx) ?: return
        val base = ctx.getString(com.altrii.recovery.R.string.altrii_base_url).trimEnd('/')
        val url = URL("$base/api/devices/$devId")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
        }
        val resp = conn.inputStream.bufferedReader().use { it.readText() }
        val obj = JSONObject(resp)

        val lockUntilIso = obj.optString("lockUntil", null)
        val token = obj.optString("token", null)

        val untilMillis = lockUntilIso?.let {
            try { Instant.parse(it).toEpochMilli() } catch (_: Throwable) { 0L }
        } ?: 0L

        Prefs.saveLock(ctx, token ?: "", untilMillis)

        if (untilMillis > System.currentTimeMillis()) {
            if (DpcPolicy.isDeviceOwner(ctx)) DpcPolicy.applyLock(ctx)
        } else {
            if (DpcPolicy.isDeviceOwner(ctx)) DpcPolicy.clearLock(ctx)
        }
    }
}
