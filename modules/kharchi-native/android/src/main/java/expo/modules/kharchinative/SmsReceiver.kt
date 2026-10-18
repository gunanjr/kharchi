package expo.modules.kharchinative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import org.json.JSONObject
import java.util.UUID

/**
 * Works while the app is closed. Joins multipart messages, applies the on-device prefilter, and ONLY for
 * financial candidates queues them + posts the "What was this for?" notification.
 * Everything else is discarded here: not stored, not logged.
 */
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    if (!NativeSettings.smsEnabled(context)) return
    val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    // join multi-part messages per sender
    val bySender = LinkedHashMap<String, StringBuilder>()
    var ts = System.currentTimeMillis()
    for (m in parts) {
      val sender = m.originatingAddress ?: continue
      bySender.getOrPut(sender) { StringBuilder() }.append(m.messageBody ?: "")
      if (m.timestampMillis > 0) ts = m.timestampMillis
    }
    for ((sender, sb) in bySender) {
      if (!Prefilter.looksLikeBankSender(sender)) continue
      if (!Prefilter.senderAllowed(sender, NativeSettings.allowlist(context))) continue
      val cand = Prefilter.evaluate(sb.toString()) ?: continue
      if (!Dedupe.firstSighting(context, cand.direction, cand.amountMinor)) continue
      val id = UUID.randomUUID().toString()
      Queue.add(context, JSONObject().apply {
        put("id", id); put("origin", "sms"); put("sender", sender); put("title", JSONObject.NULL)
        put("body", sb.toString()); put("receivedAt", ts)
      })
      Notifier.postPrompt(context, id, cand)
    }
  }
}
