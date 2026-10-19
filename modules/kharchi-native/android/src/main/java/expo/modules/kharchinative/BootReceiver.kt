package expo.modules.kharchinative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Restores the optional persistent notification and user reminders after a reboot. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
    Reminders.rescheduleAll(context)
    if (NativeSettings.persistentNotif(context)) Notifier.setPersistent(context, true)
  }
}
