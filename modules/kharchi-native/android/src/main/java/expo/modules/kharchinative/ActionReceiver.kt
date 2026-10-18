package expo.modules.kharchinative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.RemoteInput

/** Handles the notification's inline reply / category chip / "Not mine" without opening the app. */
class ActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra(Notifier.EXTRA_ID) ?: return
    when (intent.action) {
      Notifier.ACTION_REPLY -> {
        val text = RemoteInput.getResultsFromIntent(intent)?.getCharSequence(Notifier.KEY_NOTE)?.toString()?.trim()
        if (text.isNullOrEmpty()) { Notifier.postDone(context, id, "Nothing saved"); return }
        val cat = Prefilter.guessCategory(text, Queue.get(context, id)?.optString("body")?.let { Prefilter.evaluate(it)?.direction != "credit" } ?: true)
        Queue.resolve(context, id, if (cat == "other") null else cat, text, false)
        Notifier.postDone(context, id, "Saved: $text ✓")
      }
      Notifier.ACTION_CATEGORY -> {
        val cat = intent.getStringExtra(Notifier.EXTRA_CATEGORY)
        Queue.resolve(context, id, cat, null, false)
        Notifier.postDone(context, id, "Saved under ${Prefilter.categoryLabel(cat ?: "other")} ✓")
      }
      Notifier.ACTION_NOT_MINE -> {
        Queue.resolve(context, id, null, null, true)
        Notifier.postDone(context, id, "Got it. Ignoring this one.")
      }
      else -> return
    }
    DrainTaskService.tryStart(context)
  }
}
