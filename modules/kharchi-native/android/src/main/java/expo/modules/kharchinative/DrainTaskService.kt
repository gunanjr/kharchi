package expo.modules.kharchinative

import android.content.Context
import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Best-effort: wakes the JS runtime to run the registered "KharchiDrain" task so a reply typed in the
 * notification becomes a saved transaction even if the app is never opened. If Android refuses the
 * background service start, nothing is lost: the queue is drained next time the app opens.
 */
class DrainTaskService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig =
    HeadlessJsTaskConfig("KharchiDrain", Arguments.createMap(), 20_000, true)

  companion object {
    fun tryStart(c: Context) {
      try {
        val i = Intent(c.applicationContext, DrainTaskService::class.java)
        c.applicationContext.startService(i)
        acquireWakeLockFor(c)
      } catch (_: Exception) { /* fall back to drain-on-open */ }
    }

    private fun acquireWakeLockFor(c: Context) {
      try { HeadlessJsTaskService.acquireWakeLockNow(c.applicationContext) } catch (_: Exception) {}
    }
  }
}
