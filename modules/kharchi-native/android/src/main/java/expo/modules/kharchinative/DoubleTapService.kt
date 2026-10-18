package expo.modules.kharchinative

import android.app.Notification
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import kotlin.math.abs
import kotlin.math.sqrt

/**
 * EXPERIMENTAL (full variant only, off by default). Foreground service that watches the accelerometer for
 * two sharp taps ~100-500 ms apart (a back-tap) and opens Quick Add. Rate limited. Costs battery: the
 * settings screen warns about this. Android may block starting an activity from the background; in that
 * case we show a heads-up notification the user can tap.
 */
class DoubleTapService : Service(), SensorEventListener {
  private lateinit var sm: SensorManager
  private var lastMag = 9.8f
  private var firstSpike = 0L
  private var lastFire = 0L

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    Notifier.ensureChannels(this)
    val n: Notification = NotificationCompat.Builder(this, Notifier.CHANNEL_PERSIST)
      .setSmallIcon(applicationInfo.icon.takeIf { it != 0 } ?: android.R.drawable.ic_input_add)
      .setContentTitle("Double-tap to add expense is on")
      .setContentText("Uses the motion sensor. Turn off in Settings to save battery.")
      .setOngoing(true).setPriority(NotificationCompat.PRIORITY_LOW).setContentIntent(Notifier.openAppIntent(this)).build()
    val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
    ServiceCompat.startForeground(this, 7002, n, type)
    sm = getSystemService(Context.SENSOR_SERVICE) as SensorManager
    sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)?.let { sm.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME) }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int) = START_STICKY

  override fun onDestroy() {
    if (::sm.isInitialized) sm.unregisterListener(this)
    super.onDestroy()
  }

  override fun onSensorChanged(e: SensorEvent) {
    val mag = sqrt(e.values[0] * e.values[0] + e.values[1] * e.values[1] + e.values[2] * e.values[2])
    val jerk = abs(mag - lastMag)
    lastMag = mag
    // sensitivity 0..100 -> threshold 14..3 m/s^2 of jerk
    val s = NativeSettings.doubleTapSensitivity(this).coerceIn(0, 100)
    val threshold = 14f - (s / 100f) * 11f
    if (jerk < threshold) return
    val now = System.currentTimeMillis()
    if (now - lastFire < 2000) return // rate limit
    when {
      firstSpike == 0L || now - firstSpike > 500 -> firstSpike = now
      now - firstSpike >= 90 -> { // second spike inside the window
        firstSpike = 0L
        lastFire = now
        fire()
      }
    }
  }

  private fun fire() {
    try {
      startActivity(Notifier.quickAddIntent(this))
    } catch (_: Exception) {
      Notifier.postQuickAddHeadsUp(this)
    }
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

  companion object {
    fun start(c: Context) {
      val i = Intent(c.applicationContext, DoubleTapService::class.java)
      if (Build.VERSION.SDK_INT >= 26) c.applicationContext.startForegroundService(i) else c.applicationContext.startService(i)
    }
    fun stop(c: Context) { c.applicationContext.stopService(Intent(c.applicationContext, DoubleTapService::class.java)) }
  }
}
