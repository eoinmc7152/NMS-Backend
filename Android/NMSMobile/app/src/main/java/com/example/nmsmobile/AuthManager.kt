package com.example.nmsmobile

import android.content.Context

object AuthManager {
    private const val PREFS = "nms_auth"
    private const val KEY_EMAIL = "email"
    private const val KEY_PASSWORD = "password"
    private const val KEY_LOGGED_IN = "logged_in"

    fun register(context: Context, email: String, password: String) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.edit()
            .putString(KEY_EMAIL, email.trim().lowercase())
            .putString(KEY_PASSWORD, password) // (demo only — plain text)
            .apply()
    }

    fun login(context: Context, email: String, password: String): Boolean {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val savedEmail = prefs.getString(KEY_EMAIL, null)
        val savedPass = prefs.getString(KEY_PASSWORD, null)

        val ok = savedEmail == email.trim().lowercase() && savedPass == password
        if (ok) {
            prefs.edit().putBoolean(KEY_LOGGED_IN, true).apply()
        }
        return ok
    }

    fun isLoggedIn(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return prefs.getBoolean(KEY_LOGGED_IN, false)
    }

    fun logout(context: Context) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(KEY_LOGGED_IN, false).apply()
    }

    fun hasRegisteredUser(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return !prefs.getString(KEY_EMAIL, null).isNullOrBlank()
    }
}
