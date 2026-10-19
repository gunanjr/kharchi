package expo.modules.kharchinative

import android.app.Activity
import java.lang.ref.WeakReference

/**
 * Remembers the live QuickAddActivity so JS can close exactly that window.
 * (Two ReactActivities share one JS runtime, so `currentActivity` and process-wide JS flags are unreliable.)
 */
object QuickAddRegistry {
  private var ref: WeakReference<Activity>? = null

  @Synchronized fun register(a: Activity) { ref = WeakReference(a) }

  @Synchronized fun unregister(a: Activity) { if (ref?.get() === a) ref = null }

  @Synchronized fun finish(): Boolean {
    val a = ref?.get() ?: return false
    a.runOnUiThread { a.finish() }
    return true
  }
}
