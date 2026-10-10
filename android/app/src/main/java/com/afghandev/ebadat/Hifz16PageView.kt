package com.afghandev.ebadat

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Typeface
import android.os.Bundle
import android.util.Log
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityNodeProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.abs
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
  private val inkBounds = Rect()
  private val metaPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.SUBPIXEL_TEXT_FLAG)
  private val framePaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val highlightPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    strokeJoin = Paint.Join.ROUND
    strokeCap = Paint.Cap.ROUND
  }
  private val ayahHitTargets = mutableListOf<AyahHitTarget>()
  private var lines: List<Line> = emptyList()
  private var pageNumber = 1
  private var juzNumber = 1
  private var paperColor = Color.rgb(251, 247, 239)
  private var inkColor = Color.rgb(26, 46, 40)
  private var accentColor = Color.rgb(14, 107, 79)
  private var highlightSurah: Int? = null
  private var highlightAyah: Int? = null
  private var touchDownX = 0f
  private var touchDownY = 0f
  private var touchMoved = false
  private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
  private var topInset = 0f
  private var bottomInset = 0f
  private val amiriTypeface: Typeface = Typeface.createFromAsset(context.assets, "fonts/AmiriQuran-Regular.ttf")
  private val scheherazadeTypeface: Typeface = Typeface.createFromAsset(context.assets, "fonts/ScheherazadeNew-Regular.ttf")
  private var maxTatweelPerWord = 4

  init {
    setWillNotDraw(false)
    isClickable = true
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_YES
    arabicPaint.typeface = amiriTypeface
    arabicPaint.isSubpixelText = true
    metaPaint.typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
  }

  fun setFontFamily(family: String?) {
    val scheherazade = family == "ScheherazadeNew"
    val cap = if (scheherazade) 8 else 4
    val next = if (scheherazade) scheherazadeTypeface else amiriTypeface
    if (arabicPaint.typeface === next && maxTatweelPerWord == cap) return
    arabicPaint.typeface = next
    maxTatweelPerWord = cap
    invalidate()
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
        val type = item.optString("type", "spacer")
        val rawText = item.optString("text", "")
        parsed += Line(
          number = item.optInt("line", index + 1),
          type = type,
          text = rawText,
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
    if (highlightSurah == value) return
    highlightSurah = value
    invalidate()
  }

  fun setActiveAyah(value: Int?) {
    if (highlightAyah == value) return
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
    // Pages 1–2 sit inside the dedication page's floral frame, which React
    // Native draws over this view. The insets must match Hifz16View's OPENING_* values.
    val textLeft = if (opening) OPENING_SIDE_INSET * density else left + 9f * density
    val textRight = if (opening) width - OPENING_SIDE_INSET * density else right - 9f * density
    val textWidth = textRight - textLeft
    val normalLines = lines.filter { it.type == "ayah" && it.text.isNotBlank() }
    val fontSize = pageFontSize(normalLines, textWidth, rowHeight)
    // Both opening pages share page 2's block height, so the surah plaque and
    // the bismillah start at the same Y. Page 2 still keeps the extra gap
    // before its ayahs, and page 1 simply ends half a row higher.
    val openingRows = mutableMapOf<Int, Float>()
    if (opening) {
      val openingLines = lines.filter { it.type != "spacer" && it.text.isNotBlank() }
      val areaTop = topInset + OPENING_TEXT_TOP * density
      val areaBottom = height - bottomInset - OPENING_TEXT_BOTTOM * density
      var y = areaTop + ((areaBottom - areaTop) - OPENING_SHARED_ROWS * rowHeight) / 2f
      for (line in openingLines) {
        openingRows[line.number] = y
        y += openingRowSpan(line) * rowHeight
      }
    }
    metaPaint.color = accentColor
    metaPaint.textSize = 11f * resources.displayMetrics.scaledDensity
    val metaBaseline = if (opening) topInset + OPENING_META_BASELINE * density else outerTop + 19f * density
    val metaLeft = if (opening) textLeft else left + 8f * density
    val metaRight = if (opening) textRight else right - 8f * density
    metaPaint.textAlign = Paint.Align.LEFT
    canvas.drawText(toArabicNumerals(pageNumber), metaLeft, metaBaseline, metaPaint)
    metaPaint.textAlign = Paint.Align.RIGHT
    canvas.drawText("الجزء ${toArabicNumerals(juzNumber)}", metaRight, metaBaseline, metaPaint)
    if (!opening) {
      canvas.drawLine(left + 7f * density, outerTop + 25f * density, right - 7f * density, outerTop + 25f * density, framePaint)
    }
    ayahHitTargets.clear()

    for (line in lines) {
      if (line.type == "spacer" || line.text.isBlank()) continue
      val top = openingRows[line.number] ?: (textTop + (line.number - 1).coerceIn(0, 15) * rowHeight)
      val bottom = top + rowHeight

      val lineSize = when (line.type) {
        "surah_name" -> fontSize * 0.92f
        "basmallah" -> fontSize * 1.02f
        else -> fontSize
      }
      arabicPaint.textSize = lineSize
      arabicPaint.textScaleX = 1f
      arabicPaint.color = if (line.type == "ayah") inkColor else accentColor
      val baseline = letterBaseline(top, rowHeight)

      if (line.type == "surah_name") {
        if (opening) {
          drawOpeningNamePlaque(canvas, textLeft, textRight, top, bottom, density, outerBottom)
          drawFitted(canvas, line.text, (textLeft + textRight) / 2f, baseline, textWidth * 0.72f, lineSize, Paint.Align.CENTER)
        } else {
          drawHeadingBand(canvas, line, top, bottom, textLeft, textRight, baseline, lineSize, density, needsInlineBismillah(line), outerBottom)
        }
        continue
      }

      val fatihaBismillah = isFatihaBismillah(line)
      var centered = line.centered || line.type == "basmallah" || fatihaBismillah
      if (line.type == "ayah" && centered && !fatihaBismillah) {
        val natural = arabicPaint.measureText(line.text)
        // A short closing phrase stays centered at the page's normal size.
        if (natural >= textWidth * 0.55f) centered = false
      }
      arabicPaint.textAlign = if (centered) Paint.Align.CENTER else Paint.Align.RIGHT
      val stretched = when {
        line.type != "ayah" -> line.text
        centered -> HifzKashidaPolicy.apply(line.text, 0)
        else -> stretchToWidth(line.text, textWidth)
      }
      val lifted = if (line.type == "ayah") prepareAyahLine(stretched) else PreparedAyah(stretched, emptyList(), emptyList(), emptyList())
      val text = lifted.text
      var drawBaseline = baseline
      arabicPaint.textScaleX = 1f
      if (text.isNotEmpty() && arabicPaint.measureText(text) > textWidth) {
        // Extra width comes off this row's font size. The pause column is drawn
        // separately, so the run is never squeezed with textScaleX.
        fitAyahBySize(text, textWidth, lineSize)
        drawBaseline = letterBaseline(top, rowHeight)
      }
      if (line.type == "ayah" && line.surah != null && text.isNotEmpty()) {
        drawAyahSpans(canvas, line, text, top, bottom, centered, textRight, density, outerBottom)
      }
      val originX = if (centered) (left + right) / 2f else textRight
      if (text.isNotEmpty()) {
        canvas.drawText(text, originX, drawBaseline, arabicPaint)
      }
      if (lifted.maddaAnchors.isNotEmpty()) {
        drawRaisedMarks(canvas, text, lifted.maddaAnchors, "\u0653", originX, drawBaseline, centered, 1.00f)
      }
      if (lifted.smallMeemAnchors.isNotEmpty()) {
        drawRaisedMarks(canvas, text, lifted.smallMeemAnchors, "\u06E2", originX, drawBaseline, centered, 1.22f, 0.72f)
      }
      if (lifted.columns.isNotEmpty()) {
        drawPauseColumns(canvas, lifted, originX, drawBaseline, centered, top)
      }
      arabicPaint.textScaleX = 1f
      arabicPaint.textSize = lineSize
    }
  }

  /** Al-Fatiha's first ayah is the bismillah. It stays centered at its natural width. */
  private fun isFatihaBismillah(line: Line): Boolean =
    pageNumber == 1 && line.type == "ayah" && line.surah == 1 && line.ayahStart == 1 && line.ayahEnd == 1

  private fun openingRowSpan(line: Line): Float =
    if (line.type == "basmallah") 1f + OPENING_BASMALLAH_GAP else 1f

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
    frameBottom: Float,
  ) {
    val drop = opticalDrop(bottom - top)
    val ruleGap = 1.5f * density
    val band = RectF(
      textLeft,
      top + ruleGap + drop,
      textRight,
      min(bottom - ruleGap + drop, frameBottom - ruleGap),
    )
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
    frameBottom: Float,
  ) {
    val width = textRight - textLeft
    val drop = opticalDrop(bottom - top)
    val plaque = RectF(
      textLeft + width * 0.18f,
      top + density + drop,
      textRight - width * 0.18f,
      min(bottom - density + drop, frameBottom),
    )
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

  /** Shrink text size down to 72%, then scale horizontally no lower than 0.92. Leaves the paint fitted. */
  private fun applyFit(text: String, available: Float, baseSize: Float) {
    var size = baseSize
    val floor = baseSize * 0.72f
    arabicPaint.textScaleX = 1f
    arabicPaint.textSize = size
    while (size > floor && arabicPaint.measureText(text) > available) {
      size -= resources.displayMetrics.scaledDensity
      arabicPaint.textSize = size
    }
    val measured = arabicPaint.measureText(text)
    if (measured > available) {
      arabicPaint.textScaleX = (available / max(1f, measured)).coerceIn(0.92f, 1f)
    }
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
    arabicPaint.textAlign = align
    applyFit(text, available, baseSize)
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
    frameBottom: Float,
  ) {
    val surah = line.surah ?: return
    val spans = HifzAyahSegments.split(text, line.ayahStart, line.ayahEnd)
    if (spans.isEmpty()) return

    val measuredWidth = arabicPaint.measureText(text)
    // Advance is measured inside the shaped line, so kashida stays in the same
    // boxes as the glyphs. Isolated substring widths drift.
    val shapedWidths = spans.map { span ->
      val toEnd = arabicPaint.getRunAdvance(text, 0, text.length, 0, text.length, true, span.end)
      val toStart = arabicPaint.getRunAdvance(text, 0, text.length, 0, text.length, true, span.start)
      abs(toEnd - toStart)
    }
    val shapedSum = shapedWidths.sum()
    val segmentWidths = if (shapedSum > 1f && abs(shapedSum - measuredWidth) <= measuredWidth * 0.25f) {
      shapedWidths
    } else {
      val isolated = spans.map { span -> arabicPaint.measureText(text.substring(span.start, span.end)) }
      val isolatedSum = max(1f, isolated.sum())
      isolated.map { it * measuredWidth / isolatedSum }
    }
    val center = width / 2f
    var cursorRight = if (centered) center + measuredWidth / 2f else textRight
    // The band follows the glyph ink. Advance is wider than the ink, so the old
    // box ran past the last letter. Hit testing still uses the advance.
    val hitPad = 2f * density
    val side = 4f * density
    val drop = opticalDrop(bottom - top)
    val visualBottom = min(bottom + drop, frameBottom)
    val highlights = mutableListOf<RectF>()
    val ink = Rect()

    for ((index, span) in spans.withIndex()) {
      val spanWidth = max(0f, segmentWidths[index])
      val spanLeft = cursorRight - spanWidth
      val hitBounds = RectF(spanLeft - hitPad, top, cursorRight + hitPad, bottom)
      if (highlightSurah == surah && highlightAyah == span.ayah && span.end > span.start) {
        arabicPaint.getTextBounds(text, span.start, span.end, ink)
        val advance = max(spanWidth, arabicPaint.measureText(text, span.start, span.end))
        // Bounds are measured from the left of the run. The right-aligned draw
        // point is cursorRight, so the ink's right edge stays on that point.
        val originLeft = cursorRight - advance
        val visual = RectF(
          originLeft + ink.left - side,
          top + drop,
          originLeft + ink.right + side,
          visualBottom,
        )
        if (visual.width() > density && visual.height() > density) {
          val previous = highlights.lastOrNull()
          if (
            previous != null &&
            abs(previous.top - visual.top) < 1f &&
            visual.right >= previous.left - density
          ) {
            previous.left = min(previous.left, visual.left)
            previous.right = max(previous.right, visual.right)
          } else {
            highlights += visual
          }
        }
      }
      ayahHitTargets += AyahHitTarget(surah, span.ayah, hitBounds)
      cursorRight = spanLeft
    }
    highlights.forEach { drawAyahHighlight(canvas, it, density) }
  }

  /** Light mint band. The border is drawn inside the fill so it cannot meet the next line. */
  private fun drawAyahHighlight(canvas: Canvas, rect: RectF, density: Float) {
    val radius = 6f * density
    highlightPaint.style = Paint.Style.FILL
    highlightPaint.color = Color.argb(100, 184, 230, 204)
    canvas.drawRoundRect(rect, radius, radius, highlightPaint)
    val stroke = 1.25f * density
    val border = RectF(
      rect.left + stroke / 2f,
      rect.top + stroke / 2f,
      rect.right - stroke / 2f,
      rect.bottom - stroke / 2f,
    )
    if (border.width() <= stroke || border.height() <= stroke) return
    highlightPaint.style = Paint.Style.STROKE
    highlightPaint.strokeWidth = stroke
    highlightPaint.color = Color.argb(210, 36, 140, 100)
    canvas.drawRoundRect(border, max(0f, radius - stroke / 2f), max(0f, radius - stroke / 2f), highlightPaint)
  }

  private fun pageFontSize(pageLines: List<Line>, textWidth: Float, rowHeight: Float): Float {
    if (pageLines.isEmpty()) return min(rowHeight * 0.50f, 25f * resources.displayMetrics.scaledDensity)
    // Pause glyphs need a band above the letters, so the body stays at half
    // the row and the column uses the rest. Both mushaf faces share this.
    var size = min(rowHeight * 0.50f, 29f * resources.displayMetrics.scaledDensity)
    val minSize = 13f * resources.displayMetrics.scaledDensity
    while (size > minSize) {
      arabicPaint.textSize = size
      arabicPaint.textScaleX = 1f
      val widest = pageLines.maxOf { arabicPaint.measureText(it.text) }
      if (widest <= textWidth) break
      size -= resources.displayMetrics.scaledDensity
    }
    return max(minSize, size)
  }

  /** Indo-Pak pause signs. Madda and harakat are not in this set. */
  private fun isPauseMark(codePoint: Int): Boolean =
    codePoint == 0x0614 || codePoint == 0x0615 || codePoint in 0x06D6..0x06DC

  private data class PauseColumn(val anchor: Int, val marks: List<Int>)
  private data class PreparedAyah(
    val text: String,
    val columns: List<PauseColumn>,
    val maddaAnchors: List<Int>,
    val smallMeemAnchors: List<Int>,
  )

  /**
   * Pause clusters leave the run. A madda or small meem that shares its
   * letter with a shadda leaves too, so each can be drawn just above it.
   */
  private fun prepareAyahLine(text: String): PreparedAyah {
    if (text.isEmpty()) return PreparedAyah(text, emptyList(), emptyList(), emptyList())
    val out = StringBuilder(text.length)
    val columns = mutableListOf<PauseColumn>()
    val maddaAnchors = mutableListOf<Int>()
    val smallMeemAnchors = mutableListOf<Int>()
    val cluster = mutableListOf<Int>()
    var index = 0
    fun flushPause() {
      if (cluster.isEmpty()) return
      columns += PauseColumn(out.length, cluster.toList())
      cluster.clear()
    }
    while (index < text.length) {
      val codePoint = text.codePointAt(index)
      val charCount = Character.charCount(codePoint)
      if (isPauseMark(codePoint)) {
        cluster += codePoint
        index += charCount
        continue
      }
      flushPause()
      if (!isArabicBase(codePoint)) {
        out.appendCodePoint(codePoint)
        index += charCount
        continue
      }
      val anchor = out.length
      out.appendCodePoint(codePoint)
      index += charCount
      val marks = mutableListOf<Int>()
      while (index < text.length) {
        val mark = text.codePointAt(index)
        if (!isAttachedMark(mark)) break
        marks += mark
        index += Character.charCount(mark)
      }
      val stackedMadda = marks.any { it == 0x0651 } && marks.any { it == 0x0653 }
      val stackedMeem = marks.any { it == 0x0651 } && marks.any { it == 0x06E2 }
      if (stackedMadda) maddaAnchors += anchor
      if (stackedMeem) smallMeemAnchors += anchor
      for (mark in marks) {
        if (stackedMadda && mark == 0x0653) continue
        if (stackedMeem && mark == 0x06E2) continue
        out.appendCodePoint(mark)
      }
    }
    flushPause()
    return PreparedAyah(out.toString(), columns, maddaAnchors, smallMeemAnchors)
  }

  private fun isArabicBase(codePoint: Int): Boolean =
    codePoint in 0x0621..0x064A || codePoint == 0x0671 || codePoint == 0x06CC

  private fun isAttachedMark(codePoint: Int): Boolean {
    if (isPauseMark(codePoint)) return false
    if (codePoint == 0x06E2) return true
    val type = Character.getType(codePoint)
    return type == Character.NON_SPACING_MARK.toInt() ||
      type == Character.COMBINING_SPACING_MARK.toInt() ||
      type == Character.ENCLOSING_MARK.toInt()
  }

  /** Horizontal center of the letter at `anchor`, measured at the body size. */
  private fun letterCenterX(text: String, anchor: Int, originRight: Float): Float {
    if (text.isEmpty()) return originRight
    val start = anchor.coerceIn(0, text.length - 1)
    val end = (start + Character.charCount(text.codePointAt(start))).coerceAtMost(text.length)
    val advanceStart = arabicPaint.getRunAdvance(text, 0, text.length, 0, text.length, true, start)
    val advanceEnd = arabicPaint.getRunAdvance(text, 0, text.length, 0, text.length, true, end)
    return originRight - (advanceStart + advanceEnd) / 2f
  }

  /**
   * Draw a combining mark just above the shadda of its own letter.
   * `riseEm` is how far that mark's ink sits above the baseline.
   */
  private fun drawRaisedMarks(
    canvas: Canvas,
    text: String,
    anchors: List<Int>,
    glyph: String,
    originX: Float,
    baseline: Float,
    centered: Boolean,
    riseEm: Float,
    glyphScale: Float = 1f,
  ) {
    if (text.isEmpty() || anchors.isEmpty()) return
    val bodySize = arabicPaint.textSize
    val align = arabicPaint.textAlign
    val scaleX = arabicPaint.textScaleX
    val measured = arabicPaint.measureText(text)
    val originRight = if (centered) originX + measured / 2f else originX
    val centers = anchors.map { letterCenterX(text, it, originRight) }
    arabicPaint.textAlign = Paint.Align.CENTER
    arabicPaint.textScaleX = 1f
    arabicPaint.textSize = bodySize * glyphScale
    arabicPaint.getTextBounds(glyph, 0, glyph.length, inkBounds)
    val targetBottom = baseline - bodySize * riseEm
    val drawY = targetBottom - inkBounds.bottom
    for (x in centers) {
      canvas.drawText(glyph, x, drawY, arabicPaint)
    }
    arabicPaint.textSize = bodySize
    arabicPaint.textAlign = align
    arabicPaint.textScaleX = scaleX
  }

  /** Center the column in the whitespace around the pause, measured at the body size. */
  private fun pauseAnchorX(text: String, anchor: Int, originRight: Float): Float {
    var start = anchor.coerceIn(0, text.length)
    var end = start
    while (start > 0) {
      val previous = text.codePointBefore(start)
      if (!Character.isWhitespace(previous)) break
      start -= Character.charCount(previous)
    }
    while (end < text.length && Character.isWhitespace(text.codePointAt(end))) {
      end += Character.charCount(text.codePointAt(end))
    }
    val advanceStart = arabicPaint.getRunAdvance(text, 0, text.length, 0, text.length, true, start)
    val advanceEnd = arabicPaint.getRunAdvance(text, 0, text.length, 0, text.length, true, end)
    return originRight - (advanceStart + advanceEnd) / 2f
  }

  /** Nudge row frames down so the letter body, kept low for pause marks, sits in the middle. */
  private fun opticalDrop(rowHeight: Float): Float = rowHeight * 0.07f

  /**
   * Sit the letter on the lower part of the row. Jeem and meem descend about
   * 0.54em; the band above lam is left for the pause column.
   */
  private fun letterBaseline(top: Float, rowHeight: Float): Float {
    val descent = arabicPaint.textSize * 0.56f
    val pad = resources.displayMetrics.density
    return top + rowHeight - descent - pad
  }

  /**
   * Draw each pause glyph in a vertical column just above the shadda band.
   * Every mark stays large enough to read. The first stays nearest the word
   * and later marks step upward. A tall stack may use the empty gap under
   * the row above, and it is not shrunk below half the text size.
   */
  private fun drawPauseColumns(
    canvas: Canvas,
    lifted: PreparedAyah,
    originX: Float,
    baseline: Float,
    centered: Boolean,
    rowTop: Float,
  ) {
    val bodySize = arabicPaint.textSize
    val align = arabicPaint.textAlign
    val scaleX = arabicPaint.textScaleX
    val text = lifted.text
    if (text.isEmpty()) return
    val measured = arabicPaint.measureText(text)
    val originRight = if (centered) originX + measured / 2f else originX
    val anchors = lifted.columns.map { column ->
      pauseAnchorX(text, column.anchor, originRight) to column.marks
    }
    val density = resources.displayMetrics.density
    val gap = density
    // The pause glyph's ink is about half an em tall and already sits very high
    // in the font. 0.62 leaves a readable mark; the row above is mostly empty
    // because letters are pinned to the bottom of their own row.
    val preferred = 0.62f
    val floorScale = 0.50f
    val columnBottom = baseline - bodySize * 1.14f
    val rowLimit = rowTop - bodySize * 0.16f
    val room = columnBottom - rowLimit
    arabicPaint.textAlign = Paint.Align.CENTER
    arabicPaint.textScaleX = 1f
    for ((x, marks) in anchors) {
      arabicPaint.textSize = bodySize
      val inks = marks.map { mark ->
        val sample = String(Character.toChars(mark))
        arabicPaint.getTextBounds(sample, 0, sample.length, inkBounds)
        val height = (inkBounds.bottom - inkBounds.top).toFloat().coerceAtLeast(bodySize * 0.2f)
        inkBounds.top.toFloat() to height
      }
      var stack = 0f
      for ((index, ink) in inks.withIndex()) {
        stack += ink.second
        if (index > 0) stack += gap
      }
      val fitted = if (stack > 0f && room > 0f && stack * preferred > room) {
        room / stack
      } else {
        preferred
      }
      val scale = fitted.coerceIn(floorScale, preferred)
      arabicPaint.textSize = bodySize * scale
      var inkBottom = columnBottom
      for ((index, mark) in marks.withIndex()) {
        val sample = String(Character.toChars(mark))
        arabicPaint.getTextBounds(sample, 0, sample.length, inkBounds)
        val drawY = inkBottom - inkBounds.bottom
        canvas.drawText(sample, x, drawY, arabicPaint)
        inkBottom = drawY + inkBounds.top - gap
      }
    }
    arabicPaint.textSize = bodySize
    arabicPaint.textAlign = align
    arabicPaint.textScaleX = scaleX
  }

  /** Shrink an ayah row down to 72% of its size. Does not scale the run horizontally. */
  private fun fitAyahBySize(text: String, available: Float, baseSize: Float) {
    var size = baseSize
    val floor = baseSize * 0.72f
    arabicPaint.textScaleX = 1f
    arabicPaint.textSize = size
    while (size > floor && arabicPaint.measureText(text) > available) {
      size -= resources.displayMetrics.scaledDensity
      arabicPaint.textSize = size
    }
  }

  private fun stretchToWidth(text: String, available: Float): String {
    arabicPaint.textScaleX = 1f
    val minimum = HifzKashidaPolicy.apply(text, 0)
    if (arabicPaint.measureText(minimum) > available) return minimum
    val slots = HifzKashidaPolicy.slots(text)
    if (slots.isEmpty()) return minimum
    var low = 0
    var high = slots.size * maxTatweelPerWord
    var best = minimum
    while (low <= high) {
      val count = (low + high) / 2
      val candidate = HifzKashidaPolicy.apply(text, count, maxTatweelPerWord)
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
    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        touchDownX = event.x
        touchDownY = event.y
        touchMoved = false
        return true
      }
      MotionEvent.ACTION_MOVE -> {
        if (abs(event.x - touchDownX) > touchSlop || abs(event.y - touchDownY) > touchSlop) {
          touchMoved = true
        }
        return true
      }
      MotionEvent.ACTION_CANCEL -> {
        touchMoved = true
        return true
      }
      MotionEvent.ACTION_UP -> {
        val moved = touchMoved
          || abs(event.x - touchDownX) > touchSlop
          || abs(event.y - touchDownY) > touchSlop
        touchMoved = false
        if (moved) return true
        val ayahHit = ayahHitTargets.firstOrNull { it.bounds.contains(event.x, event.y) }
        if (ayahHit != null) {
          emit("topHifzLinePress", ayahHit.surah, ayahHit.ayah)
        } else {
          performClick()
          emit("topHifzPagePress", null, null)
        }
        return true
      }
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
    const val OPENING_SIDE_INSET = 44f
    const val OPENING_TEXT_TOP = 60f
    const val OPENING_TEXT_BOTTOM = 46f
    const val OPENING_META_BASELINE = 52f
    const val OPENING_BASMALLAH_GAP = 0.5f
    const val OPENING_SHARED_ROWS = 7.5f
    const val INLINE_BISMILLAH = "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِیْمِ"
  }
}
