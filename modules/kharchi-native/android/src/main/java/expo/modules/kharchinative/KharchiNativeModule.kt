package expo.modules.kharchinative

import android.Manifest
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
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

    /* ---------- bill scanning ---------- */
    lateinit var captureLauncher: AppContextActivityResultLauncher<PhotoInput, String?>
    lateinit var pickLauncher: AppContextActivityResultLauncher<PhotoInput, String?>
    RegisterActivityContracts {
      captureLauncher = registerForActivityResult(CaptureBillContract())
      pickLauncher = registerForActivityResult(PickBillContract { ctx })
    }

    /** Opens the phone's camera app; resolves with the saved photo path in the app's private folder, or null if cancelled. */
    AsyncFunction("captureBillPhoto") Coroutine { ->
      val file = BillFiles.newFile(ctx)
      try { captureLauncher.launch(PhotoInput(file.absolutePath)) } catch (_: android.content.ActivityNotFoundException) { null }
    }

    /** System photo picker; resolves with a private copy of the chosen image, or null if cancelled. */
    AsyncFunction("pickBillPhoto") Coroutine { ->
      val file = BillFiles.newFile(ctx)
      pickLauncher.launch(PhotoInput(file.absolutePath))
    }

    /** On-device OCR. Returns JSON {lines:[{text,left,top,right,bottom}], width, height}. */
    AsyncFunction("recognizeText") Coroutine { path: String ->
      if (!BillFiles.isOurs(ctx, path)) throw IllegalArgumentException("not a bill photo")
      withContext(Dispatchers.IO) { BillOcr.recognize(ctx, path) }
    }

    Function("deleteBillPhoto") { path: String -> if (BillFiles.isOurs(ctx, path)) java.io.File(path).delete() else false }

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
    /** Closes the Quick Add window (tile / widget / shortcut / launcher entry). Returns false if none is open. */
    Function("finishQuickAdd") { QuickAddRegistry.finish() }

    Function("setPersistentAddNotification") { enabled: Boolean ->
      NativeSettings.setPersistentNotif(ctx, enabled)
      Notifier.setPersistent(ctx, enabled)
    }

    /** Local reminder at an absolute time (ms since epoch). Returns an id. */
    Function("scheduleReminder") { atMs: Double, title: String, body: String -> Reminders.schedule(ctx, atMs.toLong(), title, body) }

    Function("pinScanWidget") {
      val mgr = AppWidgetManager.getInstance(ctx)
      if (Build.VERSION.SDK_INT >= 26 && mgr.isRequestPinAppWidgetSupported) {
        mgr.requestPinAppWidget(ComponentName(ctx, ScanBillWidgetProvider::class.java), null, null)
      } else false
    }

    Function("pinWidget") {
      val mgr = AppWidgetManager.getInstance(ctx)
      if (Build.VERSION.SDK_INT >= 26 && mgr.isRequestPinAppWidgetSupported) {
        mgr.requestPinAppWidget(ComponentName(ctx, QuickAddWidgetProvider::class.java), null, null)
      } else false
    }
  }
}
