package com.afghandev.ebadat

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.os.Bundle
import android.util.Log
import android.view.MotionEvent
import android.view.View
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityNodeProvider
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

  private data class AyahHitTarget(
    val surah: Int,
    val ayah: Int,
    val bounds: RectF,
  )

  private val arabicPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.SUBPIXEL_TEXT_FLAG)
  private val metaPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.SUBPIXEL_TEXT_FLAG)
  private val framePaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val highlightPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val ayahHitTargets = mutableListOf<AyahHitTarget>()
  private var lines: List<Line> = emptyList()
  private var pageNumber = 1
  private var juzNumber = 1
  private var paperColor = Color.rgb(251, 247, 239)
  private var inkColor = Color.rgb(26, 46, 40)
  private var accentColor = Color.rgb(14, 107, 79)
  private var highlightSurah: Int? = null
  private var highlightAyah: Int? = null
  private var topInset = 0f
  private var bottomInset = 0f
  private val mushafTypeface: Typeface = Typeface.createFromAsset(context.assets, "fonts/ScheherazadeNew-Regular.ttf")

  init {
    setWillNotDraw(false)
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
    } catch (error: Exception) {
      // A malformed page must never take the reader down. The data integrity
      // check catches it during development and the previous page stays visible.
      Log.e(TAG, "setPageJson failed chars=${raw.length}", error)
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    accessibilityDelegate = object : AccessibilityDelegate() {
      override fun getAccessibilityNodeProvider(host: View): AccessibilityNodeProvider = ayahAccessibility
    }
    // A prop update before attachment marks the view dirty and then drops it.
    postInvalidateOnAnimation()
  }

  fun setPaperColor(value: String?) {
    paperColor = parseColor(value, paperColor)
    invalidate()
  }

  fun setInkColor(value: String?) {
    inkColor = parseColor(value, inkColor)
    invalidate()
  }

  fun setAccentColor(value: String?) {
    accentColor = parseColor(value, accentColor)
    invalidate()
  }

  fun setTopInset(value: Float) {
    topInset = max(0f, value) * resources.displayMetrics.density
    invalidate()
  }

  fun setBottomInset(value: Float) {
    bottomInset = max(0f, value) * resources.displayMetrics.density
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
    try {
      drawPage(canvas)
    } catch (error: Exception) {
      Log.e(TAG, "onDraw page=$pageNumber lines=${lines.size} ${width}x$height", error)
    }
  }

  private fun drawPage(canvas: Canvas) {
    canvas.drawColor(paperColor)
    if (width <= 0 || height <= 0 || lines.isEmpty()) return

    val density = resources.displayMetrics.density
    val horizontal = 14f * density
    val outerTop = topInset + 7f * density
    val outerBottom = height.toFloat() - bottomInset - 7f * density
    val left = horizontal
    val right = width.toFloat() - horizontal
    if (outerBottom <= outerTop || right <= left) return

    val opening = pageNumber <= 2
    if (!opening) {
      framePaint.style = Paint.Style.STROKE
      framePaint.strokeWidth = max(1f, density)
      framePaint.color = Color.rgb(196, 163, 90)
      canvas.drawRect(left, outerTop, right, outerBottom, framePaint)
    }

    val textTop = outerTop + 30f * density
    val textBottom = outerBottom - 5f * density
    val rowHeight = (textBottom - textTop) / 16f
    if (rowHeight <= 0f) return
    val textWidth = right - left - 18f * density
    val textRight = right - 9f * density
    val textLeft = left + 9f * density
    val normalLines = lines.filter { it.type == "ayah" && it.text.isNotBlank() }
    val fontSize = pageFontSize(normalLines, textWidth, rowHeight)
    // Pages 1–2 keep the same row height as the rest of the mushaf and sit
    // as one centered block inside the mihrab. The space above and below is illumination.
    val openingLines = if (opening) lines.filter { it.type != "spacer" && it.text.isNotBlank() } else emptyList()
    val openingBlockTop = textTop + ((textBottom - textTop) - openingLines.size * rowHeight) / 2f
    val openingRows = openingLines.mapIndexed { index, line ->
      line.number to (openingBlockTop + index * rowHeight)
    }.toMap()
    if (opening && openingLines.isNotEmpty()) {
      val blockBottom = openingBlockTop + openingLines.size * rowHeight
      HifzOpeningIllumination.draw(
        canvas,
        RectF(left, outerTop, right, outerBottom),
        RectF(textLeft, openingBlockTop, textRight, blockBottom),
        density,
        accentColor,
        paperColor,
      )
    }
    metaPaint.color = accentColor
    metaPaint.textSize = 11f * resources.displayMetrics.scaledDensity
    metaPaint.textAlign = Paint.Align.LEFT
    canvas.drawText(toArabicNumerals(pageNumber), left + 8f * density, outerTop + 19f * density, metaPaint)
    metaPaint.textAlign = Paint.Align.RIGHT
    canvas.drawText("الجزء ${toArabicNumerals(juzNumber)}", right - 8f * density, outerTop + 19f * density, metaPaint)
    if (!opening) {
      canvas.drawLine(left + 7f * density, outerTop + 25f * density, right - 7f * density, outerTop + 25f * density, framePaint)
    }
    ayahHitTargets.clear()

    for (line in lines) {
      val top = openingRows[line.number] ?: (textTop + (line.number - 1).coerceIn(0, 15) * rowHeight)
      val bottom = top + rowHeight
      if (line.type == "spacer" || line.text.isBlank()) continue

      val lineSize = when (line.type) {
        "surah_name" -> fontSize * 0.92f
        "basmallah" -> fontSize * 1.02f
        else -> fontSize
      }
      arabicPaint.textSize = lineSize
      arabicPaint.textScaleX = 1f
      arabicPaint.color = if (line.type == "ayah") inkColor else accentColor
      val baseline = top + (rowHeight - (arabicPaint.descent() + arabicPaint.ascent())) / 2f

      if (line.type == "surah_name") {
        if (opening) {
          drawOpeningNamePlaque(canvas, textLeft, textRight, top, bottom, density)
          drawFitted(canvas, line.text, (textLeft + textRight) / 2f, baseline, textWidth * 0.72f, lineSize, Paint.Align.CENTER)
        } else {
          drawHeadingBand(canvas, line, top, bottom, textLeft, textRight, baseline, lineSize, density, needsInlineBismillah(line))
        }
        continue
      }

      var centered = line.centered || line.type == "basmallah"
      if (line.type == "ayah" && centered) {
        val natural = arabicPaint.measureText(line.text)
        // A short closing phrase stays centered at the page's normal size.
        if (natural >= textWidth * 0.55f) centered = false
      }
      arabicPaint.textAlign = if (centered) Paint.Align.CENTER else Paint.Align.RIGHT
      val text = if (centered) line.text else stretchToWidth(line.text, textWidth)
      if (!centered) {
        val measured = arabicPaint.measureText(text)
        arabicPaint.textScaleX = (textWidth / max(1f, measured)).coerceIn(0.94f, 1.10f)
      } else if (arabicPaint.measureText(text) > textWidth) {
        if (line.type == "ayah" && line.surah != null) {
          drawAyahSpans(canvas, line, text, top, bottom, centered, textRight, density)
        }
        drawFitted(canvas, text, (left + right) / 2f, baseline, textWidth, lineSize, Paint.Align.CENTER)
        continue
      }
      if (line.type == "ayah" && line.surah != null) {
        drawAyahSpans(canvas, line, text, top, bottom, centered, textRight, density)
      }
      canvas.drawText(text, if (centered) (left + right) / 2f else textRight, baseline, arabicPaint)
      arabicPaint.textScaleX = 1f
    }
  }

  /** Surah headings that the 16-line source left without their own bismillah row. */
  private fun needsInlineBismillah(line: Line): Boolean {
    if (line.type != "surah_name") return false
    val surah = line.surah ?: return false
    if (surah == 1 || surah == 9) return false
    val index = lines.indexOf(line)
    val next = lines.drop(index + 1).firstOrNull { it.type != "spacer" && it.text.isNotBlank() }
    return next?.type != "basmallah"
  }

  /**
   * Standard mushaf heading. The name and, when the source has no bismillah
   * row, the bismillah each keep a normal glyph size. Width is recovered by
   * lowering text size, then by a tiny horizontal scale that never goes below 0.92.
   */
  private fun drawHeadingBand(
    canvas: Canvas,
    line: Line,
    top: Float,
    bottom: Float,
    textLeft: Float,
    textRight: Float,
    baseline: Float,
    baseSize: Float,
    density: Float,
    withBismillah: Boolean,
  ) {
    val band = RectF(textLeft, top + 1.5f * density, textRight, bottom - 1.5f * density)
    val radius = 7f * density
    highlightPaint.style = Paint.Style.FILL
    highlightPaint.color = Color.argb(28, Color.red(accentColor), Color.green(accentColor), Color.blue(accentColor))
    canvas.drawRoundRect(band, radius, radius, highlightPaint)
    framePaint.style = Paint.Style.STROKE
    framePaint.strokeWidth = max(1f, density)
    framePaint.color = accentColor
    canvas.drawRoundRect(band, radius, radius, framePaint)
    framePaint.color = Color.rgb(196, 163, 90)
    framePaint.strokeWidth = max(1f, 0.6f * density)
    canvas.drawLine(band.left + 10f * density, band.top - 1.5f * density, band.right - 10f * density, band.top - 1.5f * density, framePaint)
    canvas.drawLine(band.left + 10f * density, band.bottom + 1.5f * density, band.right - 10f * density, band.bottom + 1.5f * density, framePaint)
    arabicPaint.color = accentColor
    if (!withBismillah) {
      drawFitted(canvas, line.text, band.centerX(), baseline, band.width() * 0.9f, baseSize, Paint.Align.CENTER)
      return
    }
    val inner = band.width() - 12f * density
    val nameWidth = inner * 0.36f
    val bismWidth = inner - nameWidth - 8f * density
    val nameRight = band.right - 6f * density
    drawFitted(canvas, line.text, nameRight, baseline, nameWidth, baseSize, Paint.Align.RIGHT)
    drawFitted(canvas, INLINE_BISMILLAH, band.left + 6f * density + bismWidth / 2f, baseline, bismWidth, baseSize, Paint.Align.CENTER)
  }

  /** Gold plaque under the surah name inside the opening mihrab. */
  private fun drawOpeningNamePlaque(
    canvas: Canvas,
    textLeft: Float,
    textRight: Float,
    top: Float,
    bottom: Float,
    density: Float,
  ) {
    val width = textRight - textLeft
    val plaque = RectF(textLeft + width * 0.18f, top + density, textRight - width * 0.18f, bottom - density)
    highlightPaint.style = Paint.Style.FILL
    highlightPaint.color = Color.argb(36, Color.red(accentColor), Color.green(accentColor), Color.blue(accentColor))
    val path = plaquePath(plaque, 8f * density)
    canvas.drawPath(path, highlightPaint)
    framePaint.style = Paint.Style.STROKE
    framePaint.strokeWidth = max(1f, 0.9f * density)
    framePaint.color = Color.rgb(196, 163, 90)
    canvas.drawPath(path, framePaint)
  }

  private fun plaquePath(plaque: RectF, notch: Float): Path = Path().apply {
    moveTo(plaque.left + notch, plaque.top)
    lineTo(plaque.right - notch, plaque.top)
    lineTo(plaque.right, plaque.centerY())
    lineTo(plaque.right - notch, plaque.bottom)
    lineTo(plaque.left + notch, plaque.bottom)
    lineTo(plaque.left, plaque.centerY())
    close()
  }

  /** Shrink text size down to 72%, then scale horizontally no lower than 0.92. */
  private fun drawFitted(
    canvas: Canvas,
    text: String,
    x: Float,
    baseline: Float,
    available: Float,
    baseSize: Float,
    align: Paint.Align,
  ) {
    var size = baseSize
    val floor = baseSize * 0.72f
    arabicPaint.textScaleX = 1f
    arabicPaint.textAlign = align
    arabicPaint.textSize = size
    while (size > floor && arabicPaint.measureText(text) > available) {
      size -= resources.displayMetrics.scaledDensity
      arabicPaint.textSize = size
    }
    val measured = arabicPaint.measureText(text)
    if (measured > available) {
      arabicPaint.textScaleX = (available / max(1f, measured)).coerceIn(0.92f, 1f)
    }
    canvas.drawText(text, x, baseline, arabicPaint)
    arabicPaint.textScaleX = 1f
    arabicPaint.textSize = baseSize
  }

  /** Paint and hit-test each ayah span while shaping the complete Arabic row in context. */
  private fun drawAyahSpans(
    canvas: Canvas,
    line: Line,
    text: String,
    top: Float,
    bottom: Float,
    centered: Boolean,
    textRight: Float,
    density: Float,
  ) {
    val surah = line.surah ?: return
    val spans = HifzAyahSegments.split(text, line.ayahStart, line.ayahEnd)
    if (spans.isEmpty()) return

    val measuredWidth = arabicPaint.measureText(text)
    // Measure visual segments separately, then normalize them to the complete
    // context-shaped row. Paint's RTL advance array is not in display order on
    // every Android release, while normalized positive segment widths keep
    // hit targets aligned with the visible right-to-left text.
    val segmentWidths = spans.map { span ->
      arabicPaint.measureText(text.substring(span.start, span.end))
    }
    val widthCorrection = measuredWidth / max(1f, segmentWidths.sum())
    val center = width / 2f
    var cursorRight = if (centered) center + measuredWidth / 2f else textRight
    val hitHeight = max((bottom - top) * 1.08f, 18f * density)
    val hitTop = (top + bottom - hitHeight) / 2f
    val hitBottom = hitTop + hitHeight

    for ((index, span) in spans.withIndex()) {
      val spanWidth = max(0f, segmentWidths[index] * widthCorrection)
      val spanLeft = cursorRight - spanWidth
      val hitBounds = RectF(spanLeft, hitTop, cursorRight, hitBottom)
      if (highlightSurah == surah && highlightAyah == span.ayah) {
        highlightPaint.color = Color.argb(68, Color.red(accentColor), Color.green(accentColor), Color.blue(accentColor))
        canvas.drawRoundRect(hitBounds, 5f * density, 5f * density, highlightPaint)
      }
      ayahHitTargets += AyahHitTarget(surah, span.ayah, hitBounds)
      cursorRight = spanLeft
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

  private fun stretchToWidth(text: String, available: Float): String {
    arabicPaint.textScaleX = 1f
    if (arabicPaint.measureText(text) >= available * 0.985f) return text
    val slots = HifzKashidaPolicy.slots(text)
    if (slots.isEmpty()) return text
    var low = 0
    var high = min(slots.size * 3, 240)
    var best = text
    while (low <= high) {
      val count = (low + high) / 2
      val candidate = HifzKashidaPolicy.apply(text, count)
      if (arabicPaint.measureText(candidate) <= available) {
        best = candidate
        low = count + 1
      } else {
        high = count - 1
      }
    }
    return best
  }

  override fun onTouchEvent(event: MotionEvent): Boolean {
    if (event.action != MotionEvent.ACTION_UP) return true
    val ayahHit = ayahHitTargets.firstOrNull { it.bounds.contains(event.x, event.y) }
    if (ayahHit != null) {
      emit("topHifzLinePress", ayahHit.surah, ayahHit.ayah)
    } else {
      performClick()
      emit("topHifzPagePress", null, null)
    }
    return true
  }

  override fun getAccessibilityNodeProvider(): AccessibilityNodeProvider = ayahAccessibility

  /**
   * Maestro's point tap clicks the accessibility node under the point instead of
   * injecting a motion event. Each ayah span is its own node so that click plays it.
   */
  private val ayahAccessibility = object : AccessibilityNodeProvider() {
    override fun createAccessibilityNodeInfo(virtualViewId: Int): AccessibilityNodeInfo? {
      if (virtualViewId == HOST_VIEW_ID) {
        val host = AccessibilityNodeInfo.obtain(this@Hifz16PageView)
        onInitializeAccessibilityNodeInfo(host)
        ayahHitTargets.indices.forEach { host.addChild(this@Hifz16PageView, it) }
        return host
      }
      val hit = ayahHitTargets.getOrNull(virtualViewId) ?: return null
      val node = AccessibilityNodeInfo.obtain(this@Hifz16PageView, virtualViewId)
      node.className = "android.widget.Button"
      node.contentDescription = "ayah ${hit.surah}:${hit.ayah}"
      node.text = "ayah ${hit.surah}:${hit.ayah}"
      node.isClickable = true
      node.isEnabled = true
      node.isFocusable = true
      node.isVisibleToUser = true
      node.addAction(AccessibilityNodeInfo.ACTION_CLICK)
      val rect = android.graphics.Rect()
      hit.bounds.roundOut(rect)
      node.setBoundsInParent(rect)
      val screen = android.graphics.Rect(rect)
      val location = IntArray(2)
      getLocationOnScreen(location)
      screen.offset(location[0], location[1])
      node.setBoundsInScreen(screen)
      node.setParent(this@Hifz16PageView)
      return node
    }

    override fun performAction(virtualViewId: Int, action: Int, arguments: Bundle?): Boolean {
      if (virtualViewId == HOST_VIEW_ID) return performAccessibilityAction(action, arguments)
      if (action != AccessibilityNodeInfo.ACTION_CLICK) return false
      val hit = ayahHitTargets.getOrNull(virtualViewId) ?: return false
      emit("topHifzLinePress", hit.surah, hit.ayah)
      return true
    }
  }

  init {
    accessibilityDelegate = object : AccessibilityDelegate() {
      override fun getAccessibilityNodeProvider(host: View): AccessibilityNodeProvider = ayahAccessibility
    }
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

  private companion object {
    const val TAG = "Hifz16Draw"
    const val INLINE_BISMILLAH = "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِیْمِ"
  }
}
