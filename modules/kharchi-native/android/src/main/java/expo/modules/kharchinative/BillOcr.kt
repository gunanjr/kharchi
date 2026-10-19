package expo.modules.kharchinative

import android.content.Context
import android.net.Uri
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * On-device text recognition (Google ML Kit, bundled Latin model). Works offline; the image never leaves the phone.
 * Returns every recognised line with its bounding box so the JS side can rebuild the receipt's table rows.
 */
object BillOcr {
  fun recognize(c: Context, path: String): String {
    val image = InputImage.fromFilePath(c, Uri.fromFile(File(path)))
    val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    try {
      val result = Tasks.await(recognizer.process(image))
      val lines = JSONArray()
      for (block in result.textBlocks) for (line in block.lines) {
        val b = line.boundingBox ?: continue
        lines.put(JSONObject().put("text", line.text).put("left", b.left).put("top", b.top).put("right", b.right).put("bottom", b.bottom))
      }
      return JSONObject().put("lines", lines).put("width", image.width).put("height", image.height).toString()
    } finally {
      recognizer.close()
    }
  }
}
