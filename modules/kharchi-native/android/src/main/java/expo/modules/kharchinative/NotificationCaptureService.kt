package expo.modules.kharchinative

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject
import java.util.UUID

/**
 * OPT-IN secondary source: payment notifications from UPI / bank apps (GPay, PhonePe, Paytm, ...).
 * Only an allow-listed set of packages is read; everything else is ignored without inspection.
 * Dedupe with SMS happens in Dedupe + again in the TS pipeline.
 */
class NotificationCaptureService : NotificationListenerService() {
  private val packages = setOf(
    "com.google.android.apps.nbu.paisa.user", "com.phonepe.app", "net.one97.paytm", "in.org.npci.upiapp",
    "com.dreamplug.androidapp", "com.csam.icici.bank.imobile", "com.snapwork.hdfc", "com.sbi.upi", "com.axis.mobile",
    "com.freecharge.android", "in.amazon.mShop.android.shopping",
  )

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val c = applicationContext
    if (!NativeSettings.notifEnabled(c)) return
    if (sbn.packageName !in packages) return
    if (sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
    val ex = sbn.notification.extras
    val title = ex.getCharSequence(Notification.EXTRA_TITLE)?.toString()
    val text = ex.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ex.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
    val cand = Prefilter.evaluate(listOfNotNull(title, text).joinToString(". ")) ?: return
    if (!Dedupe.firstSighting(c, cand.direction, cand.amountMinor)) return
    val id = UUID.randomUUID().toString()
    Queue.add(c, JSONObject().apply {
      put("id", id); put("origin", "notification"); put("sender", sbn.packageName)
      put("title", title ?: JSONObject.NULL); put("body", text); put("receivedAt", sbn.postTime)
    })
    Notifier.postPrompt(c, id, cand)
  }
}
