package expo.modules.kharchinative

import android.content.Context

/** Native-level duplicate guard so one payment (SMS + app notification, or carrier re-delivery) prompts the user once. */
object Dedupe {
  private const val WINDOW_MS = 10 * 60 * 1000L

  @Synchronized
  fun firstSighting(c: Context, direction: String, amountMinor: Long, now: Long = System.currentTimeMillis()): Boolean {
    val p = c.applicationContext.getSharedPreferences("kharchi_native_dedupe", Context.MODE_PRIVATE)
    val key = "$direction:$amountMinor"
    val last = p.getLong(key, 0L)
    // opportunistic cleanup of stale keys
    val e = p.edit()
    for ((k, v) in p.all) if (v is Long && now - v > WINDOW_MS) e.remove(k)
    if (now - last in 0..WINDOW_MS) { e.apply(); return false }
    e.putLong(key, now).apply()
    return true
  }
}
