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
