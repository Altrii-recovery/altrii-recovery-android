package com.altrii.recovery.core.store

import android.content.Context
import android.content.SharedPreferences

object Prefs {
    fun getLockUntil(ctx: android.content.Context): Long =
        sp(ctx).getLong("lock_until", 0L)

    private fun sp(ctx: Context): SharedPreferences =
        ctx.getSharedPreferences("altrii_prefs", Context.MODE_PRIVATE)

    fun getDeviceId(ctx: Context): String? =
        sp(ctx).getString("device_id", null)

    fun saveLock(ctx: Context, token: String, untilMillis: Long) {
        sp(ctx).edit()
            .putString("lock_token", token)
            .putLong("lock_until", untilMillis)
            .apply()
    }
}
