package expo.modules.kharchinative

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.RemoteInput
import androidx.core.content.ContextCompat

object Notifier {
  const val CHANNEL_PROMPT = "kharchi_prompt"
  const val CHANNEL_PERSIST = "kharchi_persistent"
  const val KEY_NOTE = "note"
  const val ACTION_REPLY = "expo.modules.kharchinative.REPLY"
  const val ACTION_CATEGORY = "expo.modules.kharchinative.CATEGORY"
  const val ACTION_NOT_MINE = "expo.modules.kharchinative.NOT_MINE"
  const val EXTRA_ID = "qid"
  const val EXTRA_CATEGORY = "cat"
  const val EXTRA_DESC = "desc"
  const val PERSIST_ID = 7001

  fun ensureChannels(c: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = c.getSystemService(NotificationManager::class.java)
    nm.createNotificationChannel(NotificationChannel(CHANNEL_PROMPT, "Transaction prompts", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Asks what a detected bank or UPI transaction was for"
    })
    nm.createNotificationChannel(NotificationChannel(CHANNEL_PERSIST, "Quick add shortcut", NotificationManager.IMPORTANCE_LOW).apply {
      description = "Optional always-available Add expense action"
    })
  }

  private fun canPost(c: Context) =
    Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(c, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

  fun notifId(queueId: String) = queueId.hashCode() and 0x0fffffff

  private fun fmt(minor: Long): String {
    val whole = minor / 100
    val frac = minor % 100
    val s = whole.toString().reversed().chunked(3).joinToString(",").reversed()
    return if (frac == 0L) "₹$s" else "₹$s.${frac.toString().padStart(2, '0')}"
  }

  fun openAppIntent(c: Context): PendingIntent {
    val i = c.packageManager.getLaunchIntentForPackage(c.packageName) ?: Intent()
    return PendingIntent.getActivity(c, 0, i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  /** "Spent ₹450 at Swiggy. What was this for?" with inline reply + one category chip + "Not mine". */
  fun postPrompt(c: Context, qid: String, cand: Prefilter.Candidate) {
    if (!canPost(c)) return
    ensureChannels(c)
    val verb = if (cand.direction == "debit") "Spent" else "Received"
    val prep = if (cand.direction == "debit") "at" else "from"
    val title = "$verb ${fmt(cand.amountMinor)}" + (cand.merchant?.let { " $prep $it" } ?: "")
    val id = notifId(qid)
    val flagsMutable = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
    val flagsImmutable = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

    fun intent(action: String, extra: (Intent) -> Unit = {}) = Intent(c, ActionReceiver::class.java).apply {
      this.action = action; putExtra(EXTRA_ID, qid); putExtra(EXTRA_DESC, title); extra(this)
    }
    val reply = NotificationCompat.Action.Builder(
      android.R.drawable.ic_menu_edit, "Reply",
      PendingIntent.getBroadcast(c, id, intent(ACTION_REPLY), flagsMutable),
    ).addRemoteInput(RemoteInput.Builder(KEY_NOTE).setLabel("What was this for?").build()).setAllowGeneratedReplies(false).build()
    val chip = NotificationCompat.Action.Builder(
      android.R.drawable.ic_menu_agenda, Prefilter.categoryLabel(cand.categoryKey),
      PendingIntent.getBroadcast(c, id + 1, intent(ACTION_CATEGORY) { it.putExtra(EXTRA_CATEGORY, cand.categoryKey) }, flagsImmutable),
    ).build()
    val notMine = NotificationCompat.Action.Builder(
      android.R.drawable.ic_menu_close_clear_cancel, "Not mine",
      PendingIntent.getBroadcast(c, id + 2, intent(ACTION_NOT_MINE), flagsImmutable),
    ).build()

    val n = NotificationCompat.Builder(c, CHANNEL_PROMPT)
      .setSmallIcon(c.applicationInfo.icon.takeIf { it != 0 } ?: android.R.drawable.ic_dialog_info)
      .setContentTitle(title)
      .setContentText("What was this for?")
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_MESSAGE)
      .setContentIntent(openAppIntent(c))
      .setAutoCancel(true)
      .addAction(reply).addAction(chip).addAction(notMine)
      .build()
    NotificationManagerCompat.from(c).notify(id, n)
  }

  /** Replace the prompt with a short confirmation (also stops the inline-reply spinner). */
  fun postDone(c: Context, qid: String, text: String) {
    if (!canPost(c)) return
    val n = NotificationCompat.Builder(c, CHANNEL_PROMPT)
      .setSmallIcon(c.applicationInfo.icon.takeIf { it != 0 } ?: android.R.drawable.ic_dialog_info)
      .setContentTitle(text)
      .setTimeoutAfter(4000)
      .setOnlyAlertOnce(true)
      .setAutoCancel(true)
      .build()
    NotificationManagerCompat.from(c).notify(notifId(qid), n)
  }

  fun quickAddIntent(c: Context): Intent {
    val schemeRes = c.resources.getIdentifier("kharchi_scheme", "string", c.packageName)
    val scheme = if (schemeRes != 0) c.getString(schemeRes) else "kharchi"
    return Intent(Intent.ACTION_VIEW, Uri.parse("$scheme://quick-add"))
      .setClassName(c.packageName, "${c.packageName}.QuickAddActivity")
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
  }

  fun quickAddPending(c: Context): PendingIntent =
    PendingIntent.getActivity(c, 9, quickAddIntent(c), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

  fun setPersistent(c: Context, on: Boolean) {
    val nm = NotificationManagerCompat.from(c)
    if (!on) return nm.cancel(PERSIST_ID)
    if (!canPost(c)) return
    ensureChannels(c)
    val n = NotificationCompat.Builder(c, CHANNEL_PERSIST)
      .setSmallIcon(c.applicationInfo.icon.takeIf { it != 0 } ?: android.R.drawable.ic_input_add)
      .setContentTitle("Add expense")
      .setContentText("Tap to log a spend in 3 seconds")
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setContentIntent(quickAddPending(c))
      .addAction(android.R.drawable.ic_input_add, "Add expense", quickAddPending(c))
      .build()
    nm.notify(PERSIST_ID, n)
  }

  /** Fallback when Android blocks a background activity start: a heads-up the user can tap. */
  fun postQuickAddHeadsUp(c: Context) {
    if (!canPost(c)) return
    ensureChannels(c)
    val n = NotificationCompat.Builder(c, CHANNEL_PROMPT)
      .setSmallIcon(c.applicationInfo.icon.takeIf { it != 0 } ?: android.R.drawable.ic_input_add)
      .setContentTitle("Add expense")
      .setContentText("Tap to log it now")
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setAutoCancel(true).setTimeoutAfter(6000)
      .setContentIntent(quickAddPending(c)).build()
    NotificationManagerCompat.from(c).notify(7003, n)
  }
}
