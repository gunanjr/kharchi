package expo.modules.kharchinative

import android.content.Intent

/** Holds text shared INTO the app (select a bank SMS > Share > Kharchi) until JS picks it up. */
object SharedInbox {
  private var pending: String? = null
  private const val CONSUMED = "kharchi_consumed"

  @Synchronized
  fun capture(intent: Intent?) {
    if (intent == null || intent.action != Intent.ACTION_SEND || intent.type?.startsWith("text/") != true) return
    if (intent.getBooleanExtra(CONSUMED, false)) return
    val text = intent.getStringExtra(Intent.EXTRA_TEXT) ?: return
    intent.putExtra(CONSUMED, true)
    pending = text
  }

  @Synchronized
  fun take(): String? = pending.also { pending = null }
}
