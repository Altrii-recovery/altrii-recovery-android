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
