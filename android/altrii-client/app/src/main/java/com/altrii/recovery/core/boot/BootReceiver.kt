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
