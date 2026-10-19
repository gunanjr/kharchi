package expo.modules.kharchinative

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

/** Home-screen widget: one tap drops the "Scan a bill" panel from the top (photo now, split later). */
class ScanBillWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    val layout = context.resources.getIdentifier("kharchi_scan_widget", "layout", context.packageName)
    val root = context.resources.getIdentifier("kharchi_scan_widget_root", "id", context.packageName)
    val pi: PendingIntent = Notifier.panelPending(context, "scan-bill", 12)
    for (id in ids) {
      val views = RemoteViews(context.packageName, layout)
      views.setOnClickPendingIntent(root, pi)
      manager.updateAppWidget(id, views)
    }
  }
}
