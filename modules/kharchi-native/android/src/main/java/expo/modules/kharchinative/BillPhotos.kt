package expo.modules.kharchinative

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.core.content.FileProvider
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import java.io.File
import java.io.Serializable

class KharchiFileProvider : FileProvider()

/** Bill photos live in the app's private folder. They never leave the phone. */
object BillFiles {
  private const val MAX_SIDE = 2400

  fun dir(c: Context): File = File(c.filesDir, "bills").apply { mkdirs() }

  fun newFile(c: Context): File = File(dir(c), "bill_${System.currentTimeMillis()}.jpg")

  /** Only files inside our own bills folder may be touched by JS. */
  fun isOurs(c: Context, path: String): Boolean = try {
    File(path).canonicalPath.startsWith(dir(c).canonicalPath + File.separator)
  } catch (_: Exception) { false }

  /** Applies the EXIF rotation to the pixels and shrinks very large photos, so OCR and storage stay light. */
  fun normalize(file: File) {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(file.absolutePath, bounds)
    if (bounds.outWidth <= 0) return
    var sample = 1
    while (maxOf(bounds.outWidth, bounds.outHeight) / sample > MAX_SIDE * 2) sample *= 2
    val bmp = BitmapFactory.decodeFile(file.absolutePath, BitmapFactory.Options().apply { inSampleSize = sample }) ?: return
    val rotation = when (ExifInterface(file.absolutePath).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
      ExifInterface.ORIENTATION_ROTATE_90 -> 90f
      ExifInterface.ORIENTATION_ROTATE_180 -> 180f
      ExifInterface.ORIENTATION_ROTATE_270 -> 270f
      else -> 0f
    }
    val scale = minOf(1f, MAX_SIDE.toFloat() / maxOf(bmp.width, bmp.height))
    val m = Matrix().apply { postRotate(rotation); postScale(scale, scale) }
    val out: Bitmap = if (rotation == 0f && scale == 1f) bmp else Bitmap.createBitmap(bmp, 0, 0, bmp.width, bmp.height, m, true)
    file.outputStream().use { out.compress(Bitmap.CompressFormat.JPEG, 88, it) }
    if (out !== bmp) bmp.recycle()
    out.recycle()
  }
}

data class PhotoInput(val path: String) : Serializable

/** Opens the phone's own camera app. Because WE never touch the camera, no CAMERA permission is required. */
class CaptureBillContract : AppContextActivityResultContract<PhotoInput, String?> {
  override fun createIntent(context: Context, input: PhotoInput): Intent {
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.kharchi.fileprovider", File(input.path))
    return Intent(MediaStore.ACTION_IMAGE_CAPTURE)
      .putExtra(MediaStore.EXTRA_OUTPUT, uri)
      .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
  }

  override fun parseResult(input: PhotoInput, resultCode: Int, intent: Intent?): String? {
    val f = File(input.path)
    if (resultCode != Activity.RESULT_OK || !f.exists() || f.length() == 0L) { f.delete(); return null }
    return try { BillFiles.normalize(f); input.path } catch (_: Exception) { input.path }
  }
}

/** System photo picker (no storage permission needed): the user hands over exactly one image. */
class PickBillContract(private val contextProvider: () -> Context) : AppContextActivityResultContract<PhotoInput, String?> {
  override fun createIntent(context: Context, input: PhotoInput): Intent =
    if (Build.VERSION.SDK_INT >= 33) Intent(MediaStore.ACTION_PICK_IMAGES)
    else Intent(Intent.ACTION_GET_CONTENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE)

  override fun parseResult(input: PhotoInput, resultCode: Int, intent: Intent?): String? {
    val uri: Uri = intent?.data ?: return null
    if (resultCode != Activity.RESULT_OK) return null
    return try {
      val dest = File(input.path)
      contextProvider().contentResolver.openInputStream(uri)?.use { ins -> dest.outputStream().use { ins.copyTo(it) } } ?: return null
      BillFiles.normalize(dest)
      input.path
    } catch (_: Exception) { null }
  }
}
