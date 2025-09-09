package com.altrii.recovery.admin

import android.content.Context

object DpcPolicy {
    fun isDeviceOwner(ctx: Context): Boolean = false
    fun applyLock(ctx: Context) { /* no-op for MVP build */ }
    fun clearLock(ctx: Context) { /* no-op for MVP build */ }
}
