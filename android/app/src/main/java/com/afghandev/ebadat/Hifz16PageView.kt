package com.afghandev.ebadat

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.view.MotionEvent
import android.view.View
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.min

/**
 * A fixed 16-row Indo-Pak mushaf page.  The previous JS layout measured every
 * visible line repeatedly, which made pages reflow on Android.  Canvas owns
 * shaping, fitting and drawing here, so one page is drawn in one native pass.
 */
class Hifz16PageView(context: Context) : View(context) {
  private data class Line(
    val number: Int,
    val type: String,
    val text: String,
    val centered: Boolean,
    val surah: Int?,
    val ayahStart: Int?,
    val ayahEnd: Int?,
  )

  private val arabicPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.SUBPIXEL_TEXT_FLAG)
  private val metaPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.SUBPIXEL_TEXT_FLAG)
  private val framePaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val highlightPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val lineBounds = mutableListOf<Pair<Line, RectF>>()
  private var lines: List<Line> = emptyList()
  private var pageNumber = 1
  private var juzNumber = 1
  private var paperColor = Color.rgb(251, 247, 239)
  private var inkColor = Color.rgb(26, 46, 40)
  private var highlightSurah: Int? = null
  private var highlightAyah: Int? = null
  private var topInset = 0f
  private var bottomInset = 0f
  private val mushafTypeface: Typeface = Typeface.createFromAsset(context.assets, "fonts/ScheherazadeNew-Regular.ttf")

  init {
    isClickable = true
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_YES
    arabicPaint.typeface = mushafTypeface
    arabicPaint.isSubpixelText = true
    metaPaint.typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
  }

  fun setPageJson(raw: String?) {
    if (raw.isNullOrBlank()) return
    try {
      val page = JSONObject(raw)
      pageNumber = page.optInt("page", pageNumber)
      juzNumber = page.optInt("juz", juzNumber)
      val parsed = mutableListOf<Line>()
      val source: JSONArray = page.optJSONArray("lines") ?: JSONArray()
      for (index in 0 until source.length()) {
        val item = source.optJSONObject(index) ?: continue
        parsed += Line(
          number = item.optInt("line", index + 1),
          type = item.optString("type", "spacer"),
          text = item.optString("text", ""),
          centered = item.optBoolean("centered", false),
          surah = item.optIntOrNull("surahNumber"),
          ayahStart = item.optIntOrNull("ayahStart"),
          ayahEnd = item.optIntOrNull("ayahEnd"),
        )
      }
      lines = parsed
      contentDescription = "Hafiz page $pageNumber"
      invalidate()
    } catch (_: Exception) {
      // A malformed page must never take the reader down. The data integrity
      // check catches it during development and the previous page stays visible.
    }
  }

  fun setPaperColor(value: String?) {
    paperColor = parseColor(value, paperColor)
    invalidate()
  }

  fun setInkColor(value: String?) {
    inkColor = parseColor(value, inkColor)
    invalidate()
  }

  fun setTopInset(value: Float) {
    topInset = max(0f, value)
    invalidate()
  }

  fun setBottomInset(value: Float) {
    bottomInset = max(0f, value)
    invalidate()
  }

  fun setActiveSurah(value: Int?) {
    highlightSurah = value
    invalidate()
  }

  fun setActiveAyah(value: Int?) {
    highlightAyah = value
    invalidate()
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    canvas.drawColor(paperColor)
    if (width <= 0 || height <= 0 || lines.isEmpty()) return

    val density = resources.displayMetrics.density
    val horizontal = 14f * density
    val outerTop = topInset + 7f * density
    val outerBottom = height.toFloat() - bottomInset - 7f * density
    val left = horizontal
    val right = width.toFloat() - horizontal
    if (outerBottom <= outerTop || right <= left) return

    framePaint.style = Paint.Style.STROKE
    framePaint.strokeWidth = max(1f, density)
    framePaint.color = Color.rgb(196, 163, 90)
    canvas.drawRect(left, outerTop, right, outerBottom, framePaint)

    metaPaint.color = Color.rgb(14, 107, 79)
    metaPaint.textSize = 11f * resources.displayMetrics.scaledDensity
    metaPaint.textAlign = Paint.Align.LEFT
    canvas.drawText(toArabicNumerals(pageNumber), left + 8f * density, outerTop + 19f * density, metaPaint)
    metaPaint.textAlign = Paint.Align.RIGHT
    canvas.drawText("الجزء ${toArabicNumerals(juzNumber)}", right - 8f * density, outerTop + 19f * density, metaPaint)
    canvas.drawLine(left + 7f * density, outerTop + 25f * density, right - 7f * density, outerTop + 25f * density, framePaint)

    val textTop = outerTop + 30f * density
    val textBottom = outerBottom - 5f * density
    val rowHeight = (textBottom - textTop) / 16f
    if (rowHeight <= 0f) return
    val textWidth = right - left - 18f * density
    val textRight = right - 9f * density
    val normalLines = lines.filter { it.type == "ayah" && it.text.isNotBlank() }
    val fontSize = pageFontSize(normalLines, textWidth, rowHeight)
    lineBounds.clear()

    for (line in lines) {
      val rowIndex = (line.number - 1).coerceIn(0, 15)
      val top = textTop + rowIndex * rowHeight
      val bottom = top + rowHeight
      val bounds = RectF(left + 4f * density, top, right - 4f * density, bottom)
      lineBounds += line to bounds
      if (line.type == "spacer" || line.text.isBlank()) continue

      val isActive = line.type == "ayah" && line.surah == highlightSurah &&
        highlightAyah != null && line.ayahStart != null && line.ayahEnd != null &&
        highlightAyah!! in line.ayahStart!!..line.ayahEnd!!
      if (isActive) {
        highlightPaint.color = Color.argb(34, 14, 107, 79)
        canvas.drawRoundRect(bounds, 5f * density, 5f * density, highlightPaint)
      }

      val centered = line.centered || line.type == "surah_name" || line.type == "basmallah"
      val lineSize = when (line.type) {
        "surah_name" -> fontSize * 0.92f
        "basmallah" -> fontSize * 1.02f
        else -> fontSize
      }
      arabicPaint.textSize = lineSize
      arabicPaint.color = if (line.type == "ayah") inkColor else Color.rgb(14, 107, 79)
      arabicPaint.textAlign = if (centered) Paint.Align.CENTER else Paint.Align.RIGHT
      arabicPaint.textScaleX = 1f
      val baseline = top + (rowHeight - (arabicPaint.descent() + arabicPaint.ascent())) / 2f
      val text = if (centered) fitCentered(line.text, textWidth) else stretchToWidth(line.text, textWidth)
      if (!centered) {
        val measured = arabicPaint.measureText(text)
        // Tatweel makes the organic bulk of the width. The last small residual
        // is scale correction so all normal ayah rows share true page edges.
        arabicPaint.textScaleX = (textWidth / max(1f, measured)).coerceIn(0.88f, 1.12f)
      }
      canvas.drawText(text, if (centered) (left + right) / 2f else textRight, baseline, arabicPaint)
      arabicPaint.textScaleX = 1f
    }
  }

  private fun pageFontSize(pageLines: List<Line>, textWidth: Float, rowHeight: Float): Float {
    if (pageLines.isEmpty()) return min(rowHeight * 0.62f, 25f * resources.displayMetrics.scaledDensity)
    var size = min(rowHeight * 0.68f, 29f * resources.displayMetrics.scaledDensity)
    val minSize = 13f * resources.displayMetrics.scaledDensity
    while (size > minSize) {
      arabicPaint.textSize = size
      arabicPaint.textScaleX = 1f
      val widest = pageLines.maxOf { arabicPaint.measureText(it.text) }
      if (widest <= textWidth * 1.08f) break
      size -= resources.displayMetrics.scaledDensity
    }
    return max(minSize, size)
  }

  private fun fitCentered(text: String, available: Float): String {
    arabicPaint.textScaleX = 1f
    val measured = arabicPaint.measureText(text)
    if (measured <= available) return text
    arabicPaint.textScaleX = (available / measured).coerceAtLeast(0.82f)
    return text
  }

  private fun stretchToWidth(text: String, available: Float): String {
    arabicPaint.textScaleX = 1f
    if (arabicPaint.measureText(text) >= available * 0.985f) return text
    val slots = text.indices.filter { index ->
      index + 1 < text.length && isArabicLetter(text[index]) && isArabicLetter(text[index + 1])
    }
    if (slots.isEmpty()) return text
    var low = 0
    var high = min(slots.size * 8, 180)
    var best = text
    while (low <= high) {
      val count = (low + high) / 2
      val candidate = insertTatweel(text, slots, count)
      if (arabicPaint.measureText(candidate) <= available) {
        best = candidate
        low = count + 1
      } else {
        high = count - 1
      }
    }
    return best
  }

  private fun insertTatweel(text: String, slots: List<Int>, count: Int): String {
    if (count <= 0) return text
    val inserts = IntArray(text.length)
    var placed = 0
    while (placed < count) {
      for (slot in slots) {
        if (placed >= count) break
        inserts[slot] += 1
        placed += 1
      }
    }
    val out = StringBuilder(text.length + count)
    text.forEachIndexed { index, char ->
      out.append(char)
      repeat(inserts[index]) { out.append('ـ') }
    }
    return out.toString()
  }

  private fun isArabicLetter(char: Char): Boolean =
    char in '\u0621'..'\u064A' || char in '\u0671'..'\u06D3'

  override fun onTouchEvent(event: MotionEvent): Boolean {
    if (event.action != MotionEvent.ACTION_UP) return true
    val line = lineBounds.firstOrNull { (_, bounds) -> bounds.contains(event.x, event.y) }?.first
    if (line?.type == "ayah" && line.surah != null && line.ayahStart != null) {
      emit("topHifzLinePress", line.surah, line.ayahStart)
    } else {
      performClick()
      emit("topHifzPagePress", null, null)
    }
    return true
  }

  override fun performClick(): Boolean {
    super.performClick()
    return true
  }

  private fun emit(name: String, surah: Int?, ayah: Int?) {
    val reactContext = context as? ReactContext ?: return
    val map = Arguments.createMap().apply {
      putInt("page", pageNumber)
      if (surah != null) putInt("surah", surah)
      if (ayah != null) putInt("ayah", ayah)
    }
    reactContext.getJSModule(RCTEventEmitter::class.java)
      .receiveEvent(id, name, map)
  }

  private fun JSONObject.optIntOrNull(name: String): Int? =
    if (has(name) && !isNull(name)) optInt(name).takeIf { it > 0 } else null

  private fun parseColor(value: String?, fallback: Int): Int = try {
    if (value.isNullOrBlank()) fallback else Color.parseColor(value)
  } catch (_: Exception) {
    fallback
  }

  private fun toArabicNumerals(value: Int): String = value.toString().map { "٠١٢٣٤٥٦٧٨٩"[it.digitToInt()] }.joinToString("")
}
