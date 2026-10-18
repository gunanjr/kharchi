package expo.modules.kharchinative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Restores the optional persistent notification and the experimental detector after a reboot. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
    if (NativeSettings.persistentNotif(context)) Notifier.setPersistent(context, true)
    if (NativeSettings.doubleTap(context)) DoubleTapService.start(context)
  }
}
