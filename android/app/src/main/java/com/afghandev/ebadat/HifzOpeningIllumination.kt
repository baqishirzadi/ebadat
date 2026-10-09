package com.afghandev.ebadat

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/**
 * Sar-lawh illumination for mushaf pages 1 and 2 only.
 * A pointed mihrab holds the text; the panels above and below are a mirrored
 * green-and-gold arabesque. Everything is drawn in density-independent pixels.
 */
internal object HifzOpeningIllumination {
  private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
  private val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeCap = Paint.Cap.ROUND
    strokeJoin = Paint.Join.ROUND
  }
  private val gold = Color.rgb(196, 163, 90)

  fun draw(
    canvas: Canvas,
    frame: RectF,
    textBlock: RectF,
    density: Float,
    accent: Int,
    paper: Int,
  ) {
    val cartouche = RectF(textBlock).apply { inset(-10f * density, -12f * density) }
    val arch = min(cartouche.width() * 0.16f, 34f * density)
    drawFrame(canvas, frame, density, accent)
    canvas.save()
    canvas.clipRect(frame.left + 2f * density, frame.top + 2f * density, frame.right - 2f * density, frame.bottom - 2f * density)
    val upper = RectF(frame.left + 8f * density, frame.top + 30f * density, frame.right - 8f * density, cartouche.top - arch * 0.35f)
    val lower = RectF(frame.left + 8f * density, cartouche.bottom + 4f * density, frame.right - 8f * density, frame.bottom - 8f * density)
    drawPanel(canvas, upper, density, accent, dotsAtTop = true)
    drawPanel(canvas, lower, density, accent, dotsAtTop = false)
    drawSpandrels(canvas, frame, cartouche, arch, density, accent)
    canvas.restore()
    drawCartouche(canvas, cartouche, arch, density, accent, paper)
  }

  private fun drawFrame(canvas: Canvas, frame: RectF, density: Float, accent: Int) {
    stroke.color = accent
    stroke.strokeWidth = max(1f, 1.6f * density)
    canvas.drawRect(frame, stroke)
    stroke.color = gold
    stroke.strokeWidth = max(1f, 0.8f * density)
    canvas.drawRect(
      frame.left + 3.5f * density,
      frame.top + 3.5f * density,
      frame.right - 3.5f * density,
      frame.bottom - 3.5f * density,
      stroke,
    )
  }

  private fun drawCartouche(
    canvas: Canvas,
    rect: RectF,
    arch: Float,
    density: Float,
    accent: Int,
    paper: Int,
  ) {
    val path = mihrab(rect, arch, density)
    fill.style = Paint.Style.FILL
    fill.color = cartoucheFill(paper)
    canvas.drawPath(path, fill)
    stroke.color = accent
    stroke.strokeWidth = max(1f, 1.6f * density)
    canvas.drawPath(path, stroke)
    val inner = mihrab(
      RectF(rect).apply { inset(3.2f * density, 3.2f * density) },
      arch * 0.86f,
      density,
    )
    stroke.color = gold
    stroke.strokeWidth = max(1f, 0.8f * density)
    canvas.drawPath(inner, stroke)
  }

  private fun mihrab(rect: RectF, arch: Float, density: Float): Path {
    val radius = min(16f * density, rect.width() * 0.08f)
    val peakY = rect.top - arch
    val shoulderY = rect.top + arch * 0.55f
    val cx = rect.centerX()
    return Path().apply {
      moveTo(rect.left + radius, rect.bottom)
      lineTo(rect.right - radius, rect.bottom)
      quadTo(rect.right, rect.bottom, rect.right, rect.bottom - radius)
      lineTo(rect.right, shoulderY)
      cubicTo(
        rect.right,
        rect.top + arch * 0.05f,
        cx + rect.width() * 0.16f,
        peakY,
        cx,
        peakY,
      )
      cubicTo(
        cx - rect.width() * 0.16f,
        peakY,
        rect.left,
        rect.top + arch * 0.05f,
        rect.left,
        shoulderY,
      )
      lineTo(rect.left, rect.bottom - radius)
      quadTo(rect.left, rect.bottom, rect.left + radius, rect.bottom)
      close()
    }
  }

  private fun drawPanel(canvas: Canvas, panel: RectF, density: Float, accent: Int, dotsAtTop: Boolean) {
    if (panel.height() < 12f * density || panel.width() < 40f * density) return
    val cx = panel.centerX()
    val cy = panel.centerY()
    val rose = min(panel.height() * 0.34f, 18f * density)
    drawRosette(canvas, cx, cy, rose, density, accent)
    val reachX = panel.width() * 0.36f
    val reachY = panel.height() * 0.22f
    drawVine(canvas, cx, cy, cx - reachX, cy - reachY, density, accent, flip = false)
    drawVine(canvas, cx, cy, cx + reachX, cy - reachY, density, accent, flip = true)
    drawVine(canvas, cx, cy, cx - reachX * 0.72f, cy + reachY, density, accent, flip = true)
    drawVine(canvas, cx, cy, cx + reachX * 0.72f, cy + reachY, density, accent, flip = false)
    val dotY = if (dotsAtTop) panel.top + 3f * density else panel.bottom - 3f * density
    fill.style = Paint.Style.FILL
    fill.color = gold
    var x = panel.left + 6f * density
    while (x < panel.right - 4f * density) {
      canvas.drawCircle(x, dotY, max(0.8f, 1.15f * density), fill)
      x += 8f * density
    }
  }

  private fun drawVine(
    canvas: Canvas,
    x0: Float,
    y0: Float,
    x3: Float,
    y3: Float,
    density: Float,
    accent: Int,
    flip: Boolean,
  ) {
    val dx = x3 - x0
    val dy = y3 - y0
    val bend = if (flip) -1f else 1f
    val x1 = x0 + dx * 0.35f + dy * 0.35f * bend
    val y1 = y0 + dy * 0.15f - dx * 0.08f * bend
    val x2 = x0 + dx * 0.7f - dy * 0.15f * bend
    val y2 = y0 + dy * 0.85f + dx * 0.05f * bend
    val path = Path().apply {
      moveTo(x0, y0)
      cubicTo(x1, y1, x2, y2, x3, y3)
    }
    stroke.color = accent
    stroke.strokeWidth = max(1f, 1.15f * density)
    canvas.drawPath(path, stroke)
    stroke.color = gold
    stroke.strokeWidth = max(1f, 0.45f * density)
    canvas.drawPath(path, stroke)
    for (t in floatArrayOf(0.32f, 0.58f, 0.84f)) {
      val x = cubic(t, x0, x1, x2, x3)
      val y = cubic(t, y0, y1, y2, y3)
      val angle = Math.toDegrees(kotlin.math.atan2((y3 - y).toDouble(), (x3 - x).toDouble())).toFloat()
      drawLeaf(canvas, x, y, 9f * density, angle + if (flip) -50f else 50f, accent)
      if (t > 0.5f) drawBlossom(canvas, x, y, 3.4f * density, accent)
    }
    drawBlossom(canvas, x3, y3, 4.2f * density, accent)
  }

  private fun drawRosette(canvas: Canvas, x: Float, y: Float, radius: Float, density: Float, accent: Int) {
    fill.style = Paint.Style.FILL
    for (index in 0 until 8) {
      val angle = Math.PI * 2.0 * index / 8.0 - Math.PI / 2.0
      val tipX = x + cos(angle).toFloat() * radius
      val tipY = y + sin(angle).toFloat() * radius
      val spread = radius * 0.42f
      val path = Path().apply {
        moveTo(x, y)
        cubicTo(
          x + cos(angle - 0.7).toFloat() * spread,
          y + sin(angle - 0.7).toFloat() * spread,
          tipX + cos(angle + Math.PI / 2).toFloat() * radius * 0.28f,
          tipY + sin(angle + Math.PI / 2).toFloat() * radius * 0.28f,
          tipX,
          tipY,
        )
        cubicTo(
          tipX + cos(angle - Math.PI / 2).toFloat() * radius * 0.28f,
          tipY + sin(angle - Math.PI / 2).toFloat() * radius * 0.28f,
          x + cos(angle + 0.7).toFloat() * spread,
          y + sin(angle + 0.7).toFloat() * spread,
          x,
          y,
        )
        close()
      }
      fill.color = tint(accent, if (index % 2 == 0) 168 else 120)
      canvas.drawPath(path, fill)
      stroke.color = accent
      stroke.strokeWidth = max(1f, 0.6f * density)
      canvas.drawPath(path, stroke)
    }
    fill.color = gold
    canvas.drawCircle(x, y, max(1.5f, radius * 0.22f), fill)
    stroke.color = accent
    stroke.strokeWidth = max(1f, 0.7f * density)
    canvas.drawCircle(x, y, max(1.5f, radius * 0.22f), stroke)
  }

  private fun drawBlossom(canvas: Canvas, x: Float, y: Float, radius: Float, accent: Int) {
    fill.style = Paint.Style.FILL
    fill.color = tint(accent, 185)
    for (index in 0 until 5) {
      val angle = -Math.PI / 2.0 + Math.PI * 2.0 * index / 5.0
      canvas.drawCircle(
        x + cos(angle).toFloat() * radius * 0.58f,
        y + sin(angle).toFloat() * radius * 0.58f,
        radius * 0.46f,
        fill,
      )
    }
    fill.color = gold
    canvas.drawCircle(x, y, max(1f, radius * 0.32f), fill)
  }

  private fun drawLeaf(canvas: Canvas, x: Float, y: Float, length: Float, angle: Float, accent: Int) {
    canvas.save()
    canvas.translate(x, y)
    canvas.rotate(angle)
    val path = Path().apply {
      moveTo(0f, 0f)
      quadTo(length * 0.55f, -length * 0.32f, length, 0f)
      quadTo(length * 0.55f, length * 0.32f, 0f, 0f)
      close()
    }
    fill.style = Paint.Style.FILL
    fill.color = tint(accent, 200)
    canvas.drawPath(path, fill)
    stroke.color = accent
    stroke.strokeWidth = max(1f, 0.6f)
    canvas.drawPath(path, stroke)
    canvas.restore()
  }

  private fun drawSpandrels(canvas: Canvas, frame: RectF, cartouche: RectF, arch: Float, density: Float, accent: Int) {
    val radius = min(16f * density, arch)
    val spots = listOf(
      frame.left + 10f * density to frame.top + 34f * density,
      frame.right - 10f * density to frame.top + 34f * density,
      frame.left + 10f * density to frame.bottom - 10f * density,
      frame.right - 10f * density to frame.bottom - 10f * density,
    )
    for ((x, y) in spots) {
      if (cartouche.contains(x, y)) continue
      canvas.save()
      canvas.clipRect(x - radius, y - radius, x + radius, y + radius)
      drawRosette(canvas, x, y, radius, density, accent)
      canvas.restore()
    }
  }

  private fun cartoucheFill(paper: Int): Int {
    val luminance = (Color.red(paper) * 299 + Color.green(paper) * 587 + Color.blue(paper) * 114) / 1000
    val lift = if (luminance > 150) 10 else 22
    return Color.rgb(
      min(255, Color.red(paper) + lift),
      min(255, Color.green(paper) + lift - 2),
      min(255, Color.blue(paper) + if (luminance > 150) 4 else lift),
    )
  }

  private fun tint(color: Int, alpha: Int): Int =
    Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color))

  private fun cubic(t: Float, p0: Float, p1: Float, p2: Float, p3: Float): Float {
    val u = 1f - t
    return u * u * u * p0 + 3f * u * u * t * p1 + 3f * u * t * t * p2 + t * t * t * p3
  }
}
