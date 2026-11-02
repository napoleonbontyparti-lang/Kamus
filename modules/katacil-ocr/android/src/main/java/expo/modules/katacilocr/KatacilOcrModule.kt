package expo.modules.katacilocr

import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/**
 * Распознавание текста для поиска по фото (KataCil).
 * Возвращает строки текста сверху вниз. Все ошибки — понятным текстом, без падений.
 */
class KatacilOcrModule : Module() {
  private val recognizer by lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }

  override fun definition() = ModuleDefinition {
    Name("KatacilOcr")

    AsyncFunction("recognize") { uriString: String, promise: Promise ->
      try {
        val context = appContext.reactContext
          ?: throw IllegalStateException("Приложение ещё не готово")

        val image: InputImage = when {
          uriString.startsWith("content://") || uriString.startsWith("file://") ->
            InputImage.fromFilePath(context, Uri.parse(uriString))
          else -> {
            val file = File(uriString)
            if (!file.exists()) throw IllegalArgumentException("Файл не найден")
            val bitmap = BitmapFactory.decodeFile(file.absolutePath)
              ?: throw IllegalArgumentException("Не удалось открыть изображение")
            InputImage.fromBitmap(bitmap, 0)
          }
        }

        recognizer.process(image)
          .addOnSuccessListener { result ->
            val lines = ArrayList<String>()
            for (block in result.textBlocks) {
              for (line in block.lines) {
                val t = line.text?.trim()
                if (!t.isNullOrEmpty()) lines.add(t)
              }
            }
            promise.resolve(lines)
          }
          .addOnFailureListener { e ->
            promise.reject(CodedException("OCR_FAILED", e.message ?: e.toString(), e))
          }
      } catch (e: Throwable) {
        promise.reject(CodedException("OCR_FAILED", e.message ?: e.toString(), e))
      }
    }
  }
}
