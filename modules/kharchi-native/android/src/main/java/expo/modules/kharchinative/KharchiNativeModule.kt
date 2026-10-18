package expo.modules.kharchinative

import android.Manifest
import android.app.StatusBarManager
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.drawable.Icon
import android.hardware.Sensor
import android.hardware.SensorManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class KharchiNativeModule : Module() {
  private val ctx: Context get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private fun componentDeclared(cls: Class<*>, receiver: Boolean): Boolean = try {
    val cn = ComponentName(ctx, cls)
    if (receiver) ctx.packageManager.getReceiverInfo(cn, 0) else ctx.packageManager.getServiceInfo(cn, 0)
    true
  } catch (_: PackageManager.NameNotFoundException) {
    false
  }

  override fun definition() = ModuleDefinition {
    Name("KharchiNative")

    /** false in the `lite` variant: the receiver is stripped from the manifest by the config plugin. */
    Function("smsReceiverCompiledIn") { componentDeclared(SmsReceiver::class.java, true) }

    Function("hasSmsPermission") {
      ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
    }

    OnNewIntent { intent -> SharedInbox.capture(intent) }
    OnActivityEntersForeground { SharedInbox.capture(appContext.currentActivity?.intent) }
    Function("consumeSharedText") { SharedInbox.take() }

    Function("drainQueue") { Queue.snapshot(ctx) }
    Function("ackQueue") { ids: List<String> -> Queue.ack(ctx, ids.toSet()) }

    Function("setSenderAllowlist") { list: List<String> -> NativeSettings.setAllowlist(ctx, list) }
    Function("setCaptureEnabled") { sms: Boolean, notifications: Boolean ->
      NativeSettings.setCapture(ctx, sms, notifications)
      Notifier.ensureChannels(ctx)
    }

    Function("isNotificationListenerEnabled") {
      val flat = Settings.Secure.getString(ctx.contentResolver, "enabled_notification_listeners") ?: ""
      flat.contains(ctx.packageName)
    }
    Function("notificationListenerCompiledIn") { componentDeclared(NotificationCaptureService::class.java, false) }
    Function("openNotificationListenerSettings") {
      ctx.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
    Function("openAppSettings") {
      ctx.startActivity(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${ctx.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      )
    }

    /** "quick" when this JS root belongs to the translucent QuickAddActivity (tile / shortcut / widget / double-tap). */
    Function("consumeLaunchMode") {
      val a = appContext.currentActivity
      if (a != null && a.javaClass.simpleName == "QuickAddActivity") "quick" else null
    }
    Function("finishQuickAdd") { appContext.currentActivity?.finish() }

    Function("setDoubleTapEnabled") { enabled: Boolean, sensitivity: Int ->
      val has = (ctx.getSystemService(Context.SENSOR_SERVICE) as SensorManager).getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null
      if (!has || !componentDeclared(DoubleTapService::class.java, false)) return@Function false
      NativeSettings.setDoubleTap(ctx, enabled, sensitivity)
      if (enabled) DoubleTapService.start(ctx) else DoubleTapService.stop(ctx)
      true
    }

    Function("setPersistentAddNotification") { enabled: Boolean ->
      NativeSettings.setPersistentNotif(ctx, enabled)
      Notifier.setPersistent(ctx, enabled)
    }

    Function("requestAddTile") {
      if (Build.VERSION.SDK_INT >= 33) {
        try {
          val sbm = ctx.getSystemService(StatusBarManager::class.java)
          sbm.requestAddTileService(
            ComponentName(ctx, QuickAddTileService::class.java), "Add expense",
            Icon.createWithResource(ctx, ctx.resources.getIdentifier("ic_tile_add", "drawable", ctx.packageName)),
            ctx.mainExecutor,
          ) { }
        } catch (_: Exception) {}
      }
    }

    Function("pinWidget") {
      val mgr = AppWidgetManager.getInstance(ctx)
      if (Build.VERSION.SDK_INT >= 26 && mgr.isRequestPinAppWidgetSupported) {
        mgr.requestPinAppWidget(ComponentName(ctx, QuickAddWidgetProvider::class.java), null, null)
      } else false
    }
  }
}
