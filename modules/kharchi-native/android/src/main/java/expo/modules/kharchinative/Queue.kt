package expo.modules.kharchinative

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Tiny app-private queue (SharedPreferences) that survives the app being closed.
 * Holds financial-candidate messages ONLY (the prefilter drops everything else before this point).
 * The raw text lives here transiently: JS runs the full parser, then acks, which deletes the entry.
 */
object Queue {
  private const val PREFS = "kharchi_native_queue"
  private const val KEY = "items"
  private const val MAX_ITEMS = 200

  private fun prefs(c: Context) = c.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  @Synchronized
  private fun read(c: Context): JSONArray = try {
    JSONArray(prefs(c).getString(KEY, "[]"))
  } catch (_: Exception) {
    JSONArray()
  }

  @Synchronized
  private fun write(c: Context, arr: JSONArray) {
    prefs(c).edit().putString(KEY, arr.toString()).apply()
  }

  @Synchronized
  fun add(c: Context, item: JSONObject) {
    val arr = read(c)
    arr.put(item)
    // bound the queue: drop oldest beyond MAX_ITEMS
    val trimmed = JSONArray()
    val start = maxOf(0, arr.length() - MAX_ITEMS)
    for (i in start until arr.length()) trimmed.put(arr.get(i))
    write(c, trimmed)
  }

  @Synchronized
  fun snapshot(c: Context): String = read(c).toString()

  @Synchronized
  fun ack(c: Context, ids: Set<String>) {
    val arr = read(c)
    val keep = JSONArray()
    for (i in 0 until arr.length()) {
      val o = arr.getJSONObject(i)
      if (o.optString("id") !in ids) keep.put(o)
    }
    write(c, keep)
  }

  /** Attach the user's answer from the notification (reply text / category chip / not-mine). */
  @Synchronized
  fun resolve(c: Context, id: String, categoryKey: String?, note: String?, notMine: Boolean) {
    val arr = read(c)
    for (i in 0 until arr.length()) {
      val o = arr.getJSONObject(i)
      if (o.optString("id") == id) {
        val r = JSONObject()
        if (categoryKey != null) r.put("categoryKey", categoryKey)
        if (note != null) r.put("note", note)
        if (notMine) r.put("notMine", true)
        o.put("resolution", r)
      }
    }
    write(c, arr)
  }

  @Synchronized
  fun get(c: Context, id: String): JSONObject? {
    val arr = read(c)
    for (i in 0 until arr.length()) if (arr.getJSONObject(i).optString("id") == id) return arr.getJSONObject(i)
    return null
  }
}
