package expo.modules.kharchinative

import android.app.PendingIntent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

/** Quick Settings tile "Add expense": opens the translucent drop-down panel. */
class QuickAddTileService : TileService() {
  override fun onStartListening() {
    qsTile?.apply { state = Tile.STATE_INACTIVE; label = "Add expense"; updateTile() }
  }

  @Suppress("DEPRECATION")
  override fun onClick() {
    val intent = Notifier.quickAddIntent(this)
    if (Build.VERSION.SDK_INT >= 34) {
      startActivityAndCollapse(PendingIntent.getActivity(this, 11, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
    } else {
      startActivityAndCollapse(intent)
    }
  }
}
