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
