package expo.modules.kharchinative

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

class QuickAddWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    val layout = context.resources.getIdentifier("kharchi_widget", "layout", context.packageName)
    val root = context.resources.getIdentifier("kharchi_widget_root", "id", context.packageName)
    for (id in ids) {
      val views = RemoteViews(context.packageName, layout)
      views.setOnClickPendingIntent(root, Notifier.quickAddPending(context))
      manager.updateAppWidget(id, views)
    }
  }
}
