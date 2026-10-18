package expo.modules.kharchinative

import android.content.Context

/** Native-side switches mirrored from JS settings. */
object NativeSettings {
  private fun p(c: Context) = c.applicationContext.getSharedPreferences("kharchi_native_settings", Context.MODE_PRIVATE)

  fun smsEnabled(c: Context) = p(c).getBoolean("sms", false)
  fun notifEnabled(c: Context) = p(c).getBoolean("notif", false)
  fun setCapture(c: Context, sms: Boolean, notif: Boolean) = p(c).edit().putBoolean("sms", sms).putBoolean("notif", notif).apply()

  fun allowlist(c: Context): List<String> =
    (p(c).getString("allow", "") ?: "").split(",").map { it.trim().uppercase() }.filter { it.isNotEmpty() }

  fun setAllowlist(c: Context, list: List<String>) = p(c).edit().putString("allow", list.joinToString(",")).apply()

  fun persistentNotif(c: Context) = p(c).getBoolean("persistent", false)
  fun setPersistentNotif(c: Context, v: Boolean) = p(c).edit().putBoolean("persistent", v).apply()

  fun doubleTap(c: Context) = p(c).getBoolean("dtap", false)
  fun doubleTapSensitivity(c: Context) = p(c).getInt("dtapSens", 50)
  fun setDoubleTap(c: Context, on: Boolean, sens: Int) = p(c).edit().putBoolean("dtap", on).putInt("dtapSens", sens).apply()
}
