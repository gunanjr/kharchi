package expo.modules.kharchinative

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject

/**
 * Local reminders ("Ask Ravi for ₹450") without any push service or network.
 * Uses inexact AlarmManager alarms (no SCHEDULE_EXACT_ALARM permission needed) and re-schedules after reboot.
 */
object Reminders {
  private const val PREFS = "kharchi_reminders"
  const val ACTION = "expo.modules.kharchinative.REMINDER"
  const val CHANNEL = "kharchi_reminders"

  private fun prefs(c: Context) = c.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  @Synchronized
  private fun read(c: Context): JSONArray = try { JSONArray(prefs(c).getString("items", "[]")) } catch (_: Exception) { JSONArray() }

  @Synchronized
  private fun write(c: Context, a: JSONArray) { prefs(c).edit().putString("items", a.toString()).apply() }

  private fun pending(c: Context, id: Int, title: String, body: String): PendingIntent =
    PendingIntent.getBroadcast(
      c, id,
      Intent(c, ReminderReceiver::class.java).setAction(ACTION).putExtra("id", id).putExtra("title", title).putExtra("body", body),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

  private fun arm(c: Context, id: Int, atMs: Long, title: String, body: String) {
    val am = c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMs, pending(c, id, title, body))
  }

  @Synchronized
  fun schedule(c: Context, atMs: Long, title: String, body: String): Int {
    val id = (System.currentTimeMillis() and 0x3fffffff).toInt()
    val a = read(c)
    a.put(JSONObject().put("id", id).put("at", atMs).put("title", title).put("body", body))
    write(c, a)
    arm(c, id, atMs, title, body)
    return id
  }

  @Synchronized
  fun fired(c: Context, id: Int) {
    val a = read(c)
    val keep = JSONArray()
    for (i in 0 until a.length()) if (a.getJSONObject(i).optInt("id") != id) keep.put(a.getJSONObject(i))
    write(c, keep)
  }

  /** After a reboot all alarms are gone: re-arm the ones still in the future, drop the rest. */
  @Synchronized
  fun rescheduleAll(c: Context) {
    val a = read(c)
    val keep = JSONArray()
    val now = System.currentTimeMillis()
    for (i in 0 until a.length()) {
      val o = a.getJSONObject(i)
      if (o.optLong("at") > now) {
        keep.put(o)
        arm(c, o.optInt("id"), o.optLong("at"), o.optString("title"), o.optString("body"))
      }
    }
    write(c, keep)
  }

  fun show(c: Context, id: Int, title: String, body: String) {
    if (!Notifier.canPostPublic(c)) return
    Notifier.ensureChannels(c)
    val n = NotificationCompat.Builder(c, Notifier.CHANNEL_REMINDER)
      .setSmallIcon(c.applicationInfo.icon.takeIf { it != 0 } ?: android.R.drawable.ic_dialog_info)
      .setContentTitle(title).setContentText(body).setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setAutoCancel(true).setContentIntent(Notifier.openAppIntent(c)).build()
    NotificationManagerCompat.from(c).notify(id, n)
  }
}

class ReminderReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Reminders.ACTION) return
    val id = intent.getIntExtra("id", 0)
    Reminders.show(context, id, intent.getStringExtra("title") ?: "Reminder", intent.getStringExtra("body") ?: "")
    Reminders.fired(context, id)
  }
}
