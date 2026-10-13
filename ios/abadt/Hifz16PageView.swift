import UIKit
import CoreText

/**
 * Indo-Pak 16-line page drawn with Core Text. React Native Text cannot
 * lengthen Arabic joins on iOS; CTLineCreateJustifiedLine uses the font's
 * kashida, and leftover width is filled with tatweel measured in Core Text.
 * Surah names stay inside the heading band, pause marks sit above the
 * letters, and playback highlight covers only the active ayah's glyphs.
 */
final class Hifz16PageView: UIView {
  @objc var onHifzLinePress: RCTDirectEventBlock?
  @objc var onHifzPagePress: RCTDirectEventBlock?

  private struct Line {
    let number: Int
    let type: String
    let text: String
    let centered: Bool
    let surah: Int?
    let ayahStart: Int?
    let ayahEnd: Int?
  }

  private struct Hit {
    let surah: Int
    let ayah: Int
    let rect: CGRect
  }

  private struct PauseColumn {
    let anchor: Int
    let marks: [Int]
  }

  private struct PreparedAyah {
    let text: String
    let columns: [PauseColumn]
    let maddaAnchors: [Int]
    let smallMeemAnchors: [Int]
  }

  private struct AyahSpan {
    let start: Int
    let end: Int
    let ayah: Int
  }

  /// A shaped line plus the Core Text origin used both to paint and to hit-test.
  private struct DrawnRun {
    let text: NSString
    let line: CTLine
    let font: UIFont
    let originX: CGFloat
    let baseline: CGFloat
  }

  private enum BoxAlign {
    case left
    case center
    case right
  }

  private static let ayahMarkerRegex: NSRegularExpression = {
    try! NSRegularExpression(pattern: "﴿([٠-٩۰-۹0-9]+)﴾")
  }()

  private static let inlineBismillah = "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِیْمِ"
  private static let gold = UIColor(red: 196 / 255, green: 163 / 255, blue: 90 / 255, alpha: 1)

  private var lines: [Line] = []
  private var pageNumber = 1
  private var juzNumber = 1
  private var paperColor = UIColor(red: 251 / 255, green: 247 / 255, blue: 239 / 255, alpha: 1)
  private var inkColor = UIColor(red: 26 / 255, green: 46 / 255, blue: 40 / 255, alpha: 1)
  private var accentColor = UIColor(red: 14 / 255, green: 107 / 255, blue: 79 / 255, alpha: 1)
  private var topInset: CGFloat = 0
  private var bottomInset: CGFloat = 0
  private var fontFamily = "Amiri Quran"
  private var highlightSurah = 0
  private var highlightAyah = 0
  private var hits: [Hit] = []
  private var touchMoved = false
  private var touchStart = CGPoint.zero

  override init(frame: CGRect) {
    super.init(frame: frame)
    isOpaque = true
    contentMode = .redraw
    isMultipleTouchEnabled = false
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

  @objc func setPageJson(_ raw: String?) {
    guard let raw, let data = raw.data(using: .utf8),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
    pageNumber = json["page"] as? Int ?? pageNumber
    juzNumber = json["juz"] as? Int ?? juzNumber
    var parsed: [Line] = []
    if let source = json["lines"] as? [[String: Any]] {
      for (index, item) in source.enumerated() {
        parsed.append(Line(
          number: item["line"] as? Int ?? index + 1,
          type: item["type"] as? String ?? "spacer",
          text: item["text"] as? String ?? "",
          centered: item["centered"] as? Bool ?? false,
          surah: item["surahNumber"] as? Int,
          ayahStart: item["ayahStart"] as? Int,
          ayahEnd: item["ayahEnd"] as? Int
        ))
      }
    }
    lines = parsed
    isAccessibilityElement = true
    accessibilityLabel = "Hafiz page \(pageNumber)"
    setNeedsDisplay()
  }

  @objc func setFontFamily(_ family: String?) {
    fontFamily = family?.isEmpty == false ? family! : "Amiri Quran"
    setNeedsDisplay()
  }

  @objc func setPaperColor(_ value: String?) {
    paperColor = Self.color(value, fallback: paperColor)
    backgroundColor = paperColor
    setNeedsDisplay()
  }

  @objc func setInkColor(_ value: String?) {
    inkColor = Self.color(value, fallback: inkColor)
    setNeedsDisplay()
  }

  @objc func setAccentColor(_ value: String?) {
    accentColor = Self.color(value, fallback: accentColor)
    setNeedsDisplay()
  }

  @objc func setContentTop(_ value: NSNumber?) {
    topInset = CGFloat(truncating: value ?? 0)
    setNeedsDisplay()
  }

  @objc func setContentBottom(_ value: NSNumber?) {
    bottomInset = CGFloat(truncating: value ?? 0)
    setNeedsDisplay()
  }

  @objc func setActiveSurah(_ value: NSNumber?) {
    highlightSurah = value?.intValue ?? 0
    setNeedsDisplay()
  }

  @objc func setActiveAyah(_ value: NSNumber?) {
    highlightAyah = value?.intValue ?? 0
    setNeedsDisplay()
  }

  override func draw(_ rect: CGRect) {
    guard let ctx = UIGraphicsGetCurrentContext() else { return }
    paperColor.setFill()
    ctx.fill(bounds)

    let pad: CGFloat = 10
    let outerTop = topInset + 8
    let outerBottom = bounds.height - bottomInset - 8
    let left = pad
    let right = bounds.width - pad
    guard outerBottom > outerTop + 40, right > left + 40 else { return }

    let opening = pageNumber <= 2
    let gold = UIColor(red: 196 / 255, green: 163 / 255, blue: 90 / 255, alpha: 1)
    if !opening {
      gold.setStroke()
      ctx.setLineWidth(1)
      ctx.stroke(CGRect(x: left, y: outerTop, width: right - left, height: outerBottom - outerTop))
    }

    let textTop = opening ? outerTop + 8 : outerTop + 30
    let textBottom = outerBottom - 6
    let rowHeight = (textBottom - textTop) / 16
    guard rowHeight > 8 else { return }

    let textLeft: CGFloat = opening ? 44 : left + 9
    let textRight: CGFloat = opening ? bounds.width - 44 : right - 9
    let textWidth = textRight - textLeft
    let ayahLines = lines.filter { $0.type == "ayah" && !$0.text.isEmpty }
    let family = resolvedFontName()
    // Amiri Quran's em box is much taller than its point size. A body at half
    // the row overlaps the next line, so final yeh is cut and the gaps look uneven.
    let fontSize = bodySize(rowHeight: rowHeight, textWidth: textWidth, family: family, samples: ayahLines.map(\.text))
    let bodyFont = UIFont(name: family, size: fontSize) ?? UIFont.systemFont(ofSize: fontSize)

    var openingRows: [Int: CGFloat] = [:]
    if opening {
      let openingLines = lines.filter { $0.type != "spacer" && !$0.text.isEmpty }
      let areaTop = topInset + 60
      let areaBottom = bounds.height - bottomInset - 46
      var y = areaTop + ((areaBottom - areaTop) - 7.5 * rowHeight) / 2
      for line in openingLines {
        openingRows[line.number] = y
        y += (line.type == "basmallah" ? 1.5 : 1) * rowHeight
      }
    }

    let metaFont = UIFont.systemFont(ofSize: 11, weight: .semibold)
    let metaY = opening ? topInset + 36 : outerTop + 3
    let metaStrip = CGRect(x: textLeft, y: metaY, width: textWidth, height: 18)
    let metaHalf = metaStrip.width * 0.5
    drawFittedText(
      arabicDigits(pageNumber),
      font: metaFont,
      color: accentColor,
      in: CGRect(x: metaStrip.minX, y: metaStrip.minY, width: metaHalf, height: metaStrip.height),
      align: .left
    )
    drawFittedText(
      "الجزء \(arabicDigits(juzNumber))",
      font: metaFont,
      color: accentColor,
      in: CGRect(x: metaStrip.midX, y: metaStrip.minY, width: metaHalf, height: metaStrip.height),
      align: .right
    )
    if !opening {
      gold.setStroke()
      ctx.setLineWidth(1)
      ctx.move(to: CGPoint(x: left + 7, y: outerTop + 25))
      ctx.addLine(to: CGPoint(x: right - 7, y: outerTop + 25))
      ctx.strokePath()
    }

    hits.removeAll()
    for line in lines {
      if line.type == "spacer" || line.text.isEmpty { continue }
      var top = openingRows[line.number] ?? (textTop + CGFloat(max(0, min(15, line.number - 1))) * rowHeight)
      // Al-Baqarah's bismillah sits tight under the plaque. Nudge only that line.
      if pageNumber == 2 && line.type == "basmallah" {
        top += rowHeight * 0.34
      }
      let bottom = top + rowHeight
      let lineSize: CGFloat = {
        switch line.type {
        case "surah_name": return fontSize * 0.92
        case "basmallah": return fontSize * 1.02
        default: return fontSize
        }
      }()
      let font = UIFont(name: family, size: lineSize) ?? UIFont.systemFont(ofSize: lineSize)

      if line.type == "surah_name" {
        if opening {
          drawOpeningPlaque(text: line.text, font: font, textLeft: textLeft, textRight: textRight, top: top, bottom: bottom)
        } else {
          drawHeadingBand(line: line, top: top, bottom: bottom, textLeft: textLeft, textRight: textRight, font: font)
        }
        continue
      }

      let fatihaBismillah = pageNumber == 1 && line.type == "ayah" && line.surah == 1 && line.ayahStart == 1 && line.ayahEnd == 1
      var centered = line.centered || line.type == "basmallah" || fatihaBismillah
      if line.type == "ayah" && centered && !fatihaBismillah {
        if measure(line.text, font: font) >= textWidth * 0.55 { centered = false }
      }

      let color = line.type == "ayah" ? inkColor : accentColor
      var prepared = line.type == "ayah"
        ? prepareAyahLine(line.text)
        : PreparedAyah(text: line.text, columns: [], maddaAnchors: [], smallMeemAnchors: [])
      if line.type == "ayah" && !centered {
        prepared = stretchPrepared(prepared, font: font, width: textWidth)
      }

      var usedFont = font
      let floor = max(11, font.pointSize * 0.72)
      while usedFont.pointSize > floor && measure(prepared.text, font: usedFont) > textWidth {
        let next = usedFont.pointSize - 0.5
        usedFont = UIFont(name: family, size: next) ?? usedFont.withSize(next)
      }
      let baseline = letterBaseline(top: top, rowHeight: rowHeight, font: bodyFont)
      guard let run = makeDrawnRun(
        prepared.text,
        font: usedFont,
        color: color,
        in: CGRect(x: textLeft, y: baseline, width: textWidth, height: rowHeight),
        centered: centered
      ) else { continue }

      if line.type == "ayah", let surah = line.surah, let start = line.ayahStart {
        paintAyahSpans(
          run: run,
          surah: surah,
          ayahStart: start,
          ayahEnd: line.ayahEnd ?? start,
          rowTop: top,
          rowBottom: bottom
        )
      }
      drawRun(run)
      if line.type == "ayah" {
        drawRaisedMarks(run: run, anchors: prepared.maddaAnchors, glyph: "\u{0653}", riseEm: 1.0, glyphScale: 1, color: color)
        drawRaisedMarks(run: run, anchors: prepared.smallMeemAnchors, glyph: "\u{06E2}", riseEm: 1.22, glyphScale: 0.72, color: color)
        drawPauseColumns(run: run, columns: prepared.columns, rowTop: top, color: color)
      }
    }
  }

  override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
    touchMoved = false
    touchStart = touches.first?.location(in: self) ?? .zero
  }

  override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
    guard let point = touches.first?.location(in: self) else { return }
    if hypot(point.x - touchStart.x, point.y - touchStart.y) > 8 { touchMoved = true }
  }

  override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
    touchMoved = true
  }

  override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
    guard let point = touches.first?.location(in: self) else { return }
    if touchMoved || hypot(point.x - touchStart.x, point.y - touchStart.y) > 8 { return }
    if let hit = hits.first(where: { $0.rect.contains(point) }) {
      onHifzLinePress?(["page": pageNumber, "surah": hit.surah, "ayah": hit.ayah])
    } else {
      onHifzPagePress?(["page": pageNumber])
    }
  }

  private func drawHeadingBand(line: Line, top: CGFloat, bottom: CGFloat, textLeft: CGFloat, textRight: CGFloat, font: UIFont) {
    // Stay inside this row. A band that hangs into the next row sits on the bismillah.
    let band = CGRect(x: textLeft, y: top + 3, width: textRight - textLeft, height: max(8, bottom - top - 6))
    let radius: CGFloat = 7
    accentColor.withAlphaComponent(0.11).setFill()
    UIBezierPath(roundedRect: band, cornerRadius: radius).fill()
    accentColor.setStroke()
    let stroke = UIBezierPath(roundedRect: band, cornerRadius: radius)
    stroke.lineWidth = 1
    stroke.stroke()
    guard let ctx = UIGraphicsGetCurrentContext() else { return }
    Self.gold.setStroke()
    ctx.setLineWidth(0.6)
    ctx.move(to: CGPoint(x: band.minX + 10, y: band.minY - 1.5))
    ctx.addLine(to: CGPoint(x: band.maxX - 10, y: band.minY - 1.5))
    ctx.move(to: CGPoint(x: band.minX + 10, y: band.maxY + 1.5))
    ctx.addLine(to: CGPoint(x: band.maxX - 10, y: band.maxY + 1.5))
    ctx.strokePath()

    let clip = band.insetBy(dx: 4, dy: 2)
    ctx.saveGState()
    ctx.addPath(UIBezierPath(roundedRect: clip, cornerRadius: max(1, radius - 2)).cgPath)
    ctx.clip()
    let withBismillah = needsInlineBismillah(line)
    if !withBismillah {
      drawFittedText(line.text, font: font, color: accentColor, in: clip.insetBy(dx: clip.width * 0.04, dy: 0), align: .center)
    } else {
      let inner = clip.insetBy(dx: 2, dy: 0)
      let nameWidth = inner.width * 0.36
      let bismWidth = inner.width - nameWidth - 8
      drawFittedText(
        line.text,
        font: font,
        color: accentColor,
        in: CGRect(x: inner.maxX - nameWidth, y: inner.minY, width: nameWidth, height: inner.height),
        align: .right
      )
      drawFittedText(
        Self.inlineBismillah,
        font: font,
        color: accentColor,
        in: CGRect(x: inner.minX, y: inner.minY, width: bismWidth, height: inner.height),
        align: .center
      )
    }
    ctx.restoreGState()
  }

  private func drawOpeningPlaque(text: String, font: UIFont, textLeft: CGFloat, textRight: CGFloat, top: CGFloat, bottom: CGFloat) {
    let width = textRight - textLeft
    let plaque = CGRect(x: textLeft + width * 0.18, y: top + 1, width: width * 0.64, height: max(8, bottom - top - 2))
    let notch = plaque.height * 0.35
    let path = UIBezierPath()
    path.move(to: CGPoint(x: plaque.minX + notch, y: plaque.minY))
    path.addLine(to: CGPoint(x: plaque.maxX - notch, y: plaque.minY))
    path.addLine(to: CGPoint(x: plaque.maxX, y: plaque.midY))
    path.addLine(to: CGPoint(x: plaque.maxX - notch, y: plaque.maxY))
    path.addLine(to: CGPoint(x: plaque.minX + notch, y: plaque.maxY))
    path.addLine(to: CGPoint(x: plaque.minX, y: plaque.midY))
    path.close()
    accentColor.withAlphaComponent(0.14).setFill()
    path.fill()
    Self.gold.setStroke()
    path.lineWidth = 1
    path.stroke()
    guard let ctx = UIGraphicsGetCurrentContext() else { return }
    ctx.saveGState()
    ctx.addPath(path.cgPath)
    ctx.clip()
    drawFittedText(text, font: font, color: accentColor, in: plaque.insetBy(dx: notch * 0.45, dy: 2), align: .center)
    ctx.restoreGState()
  }

  private func needsInlineBismillah(_ line: Line) -> Bool {
    guard line.type == "surah_name", let surah = line.surah, surah != 1, surah != 9 else { return false }
    guard let index = lines.firstIndex(where: { $0.number == line.number && $0.type == "surah_name" }) else { return false }
    let next = lines.dropFirst(index + 1).first { $0.type != "spacer" && !$0.text.isEmpty }
    return next?.type != "basmallah"
  }

  private func stretch(_ text: String, font: UIFont, width: CGFloat) -> String {
    let filled = fill(text, font: font, width: width, maxPerSlot: 4)
    if measure(filled, font: font) >= width * 0.97 { return filled }
    return fill(text, font: font, width: width, maxPerSlot: 6)
  }

  /// Widest tatweel fill that still fits. A second, slightly longer cap is used
  /// only when four per join still leaves a visible gap.
  private func fill(_ text: String, font: UIFont, width: CGFloat, maxPerSlot: Int) -> String {
    let natural = measure(text, font: font)
    if natural >= width { return text }
    let slots = HifzKashida.slots(text)
    if slots.isEmpty { return text }
    var low = 0
    var high = max(slots.count * maxPerSlot, 8)
    var best = text
    while low <= high {
      let count = (low + high) / 2
      let candidate = HifzKashida.apply(text, count: count, maxPerSlot: maxPerSlot)
      if measure(candidate, font: font) <= width {
        best = candidate
        low = count + 1
      } else {
        high = count - 1
      }
    }
    return best
  }

  /// Stretch the body after pause marks are lifted, and keep column anchors on the new string.
  private func stretchPrepared(_ prepared: PreparedAyah, font: UIFont, width: CGFloat) -> PreparedAyah {
    let stretched = stretch(prepared.text, font: font, width: width)
    if stretched == prepared.text { return prepared }
    func map(_ index: Int) -> Int { mapIndex(prepared.text, stretched, index) }
    return PreparedAyah(
      text: stretched,
      columns: prepared.columns.map { PauseColumn(anchor: map($0.anchor), marks: $0.marks) },
      maddaAnchors: prepared.maddaAnchors.map(map),
      smallMeemAnchors: prepared.smallMeemAnchors.map(map)
    )
  }

  /// UTF-16 index in `original` after tatweel has been inserted in `stretched`.
  private func mapIndex(_ original: String, _ stretched: String, _ index: Int) -> Int {
    let src = original as NSString
    let dst = stretched as NSString
    let target = min(max(0, index), src.length)
    var s = 0
    var d = 0
    while s < target && s < src.length && d < dst.length {
      let dstUnit = dst.character(at: d)
      let srcUnit = src.character(at: s)
      if dstUnit == 0x0640 && srcUnit != 0x0640 {
        d += 1
        continue
      }
      s += 1
      d += 1
    }
    while d < dst.length && dst.character(at: d) == 0x0640 && (s >= src.length || src.character(at: s) != 0x0640) {
      d += 1
    }
    return min(d, dst.length)
  }

  private func makeDrawnRun(_ text: String, font: UIFont, color: UIColor, in box: CGRect, centered: Bool) -> DrawnRun? {
    if text.isEmpty { return nil }
    // Tatweel fills the line. Core Text justification stretches final yeh into a dash.
    let drawLine = makeLine(text, font: font, color: color)
    let flush: CGFloat = centered ? 0.5 : 1
    let pen = CGFloat(CTLineGetPenOffsetForFlush(drawLine, flush, Double(box.width)))
    return DrawnRun(text: text as NSString, line: drawLine, font: font, originX: box.minX + pen, baseline: box.minY)
  }

  private func drawRun(_ run: DrawnRun) {
    guard let ctx = UIGraphicsGetCurrentContext() else { return }
    ctx.saveGState()
    ctx.translateBy(x: run.originX, y: run.baseline)
    ctx.scaleBy(x: 1, y: -1)
    ctx.textMatrix = .identity
    ctx.textPosition = .zero
    CTLineDraw(run.line, ctx)
    ctx.restoreGState()
  }

  /// Highlight and hit-test each ayah's own glyphs. A shared row no longer lights up as one block.
  private func paintAyahSpans(run: DrawnRun, surah: Int, ayahStart: Int, ayahEnd: Int, rowTop: CGFloat, rowBottom: CGFloat) {
    let spans = ayahSpans(run.text, startAyah: ayahStart, endAyah: ayahEnd)
    let bandHeight = max(8, rowBottom - rowTop)
    let visualTop = rowTop + bandHeight * 0.05
    let visualBottom = rowBottom - bandHeight * 0.05
    for span in spans where span.end > span.start {
      let startX = CGFloat(CTLineGetOffsetForStringIndex(run.line, span.start, nil))
      let endX = CGFloat(CTLineGetOffsetForStringIndex(run.line, span.end, nil))
      let glyphLeft = run.originX + min(startX, endX)
      let glyphRight = run.originX + max(startX, endX)
      let hit = CGRect(x: glyphLeft, y: rowTop, width: max(1, glyphRight - glyphLeft), height: max(1, rowBottom - rowTop))
      if hit.width > 1 { hits.append(Hit(surah: surah, ayah: span.ayah, rect: hit)) }
      guard highlightSurah == surah && highlightAyah == span.ayah && highlightAyah > 0 else { continue }
      let visual = CGRect(
        x: glyphLeft - 4,
        y: visualTop,
        width: max(1, glyphRight - glyphLeft + 8),
        height: max(8, visualBottom - visualTop)
      )
      let radius: CGFloat = 6
      UIColor(red: 184 / 255, green: 230 / 255, blue: 204 / 255, alpha: 100 / 255).setFill()
      UIBezierPath(roundedRect: visual, cornerRadius: radius).fill()
      let strokeWidth: CGFloat = 1.25
      let border = visual.insetBy(dx: strokeWidth / 2, dy: strokeWidth / 2)
      if border.width > strokeWidth && border.height > strokeWidth {
        let stroke = UIBezierPath(roundedRect: border, cornerRadius: max(0, radius - strokeWidth / 2))
        stroke.lineWidth = strokeWidth
        UIColor(red: 36 / 255, green: 140 / 255, blue: 100 / 255, alpha: 210 / 255).setStroke()
        stroke.stroke()
      }
    }
  }

  private func ayahSpans(_ text: NSString, startAyah: Int, endAyah: Int) -> [AyahSpan] {
    if text.length == 0 { return [] }
    let matches = Self.ayahMarkerRegex.matches(in: text as String, range: NSRange(location: 0, length: text.length))
    if matches.isEmpty { return [AyahSpan(start: 0, end: text.length, ayah: startAyah)] }
    var result: [AyahSpan] = []
    var last = 0
    for match in matches {
      let end = match.range.location + match.range.length
      let digits = text.substring(with: match.range(at: 1))
      let ayah = parseAyahDigits(digits) ?? startAyah
      if end > last { result.append(AyahSpan(start: last, end: end, ayah: ayah)) }
      last = end
    }
    if last < text.length {
      result.append(AyahSpan(start: last, end: text.length, ayah: endAyah))
    }
    return result
  }

  private func parseAyahDigits(_ value: String) -> Int? {
    var result = 0
    var any = false
    for scalar in value.unicodeScalars {
      let digit: Int
      switch scalar.value {
      case 0x0660...0x0669: digit = Int(scalar.value - 0x0660)
      case 0x06F0...0x06F9: digit = Int(scalar.value - 0x06F0)
      case 48...57: digit = Int(scalar.value - 48)
      default: return nil
      }
      any = true
      result = result * 10 + digit
    }
    return any && result > 0 ? result : nil
  }

  private func prepareAyahLine(_ raw: String) -> PreparedAyah {
    let source = raw as NSString
    if source.length == 0 {
      return PreparedAyah(text: raw, columns: [], maddaAnchors: [], smallMeemAnchors: [])
    }
    let out = NSMutableString()
    var columns: [PauseColumn] = []
    var madda: [Int] = []
    var meem: [Int] = []
    var cluster: [Int] = []
    func flushPause() {
      if cluster.isEmpty { return }
      columns.append(PauseColumn(anchor: out.length, marks: cluster))
      cluster.removeAll(keepingCapacity: true)
    }
    var index = 0
    while index < source.length {
      let (cp, len) = codePoint(in: source, at: index)
      if isPauseMark(cp) {
        cluster.append(cp)
        index += len
        continue
      }
      flushPause()
      if !isArabicBase(cp) {
        out.append(source.substring(with: NSRange(location: index, length: len)))
        index += len
        continue
      }
      let anchor = out.length
      out.append(source.substring(with: NSRange(location: index, length: len)))
      index += len
      var marks: [Int] = []
      while index < source.length {
        let (mark, markLen) = codePoint(in: source, at: index)
        if !isAttachedMark(mark) { break }
        marks.append(mark)
        index += markLen
      }
      let stackedMadda = marks.contains(0x0651) && marks.contains(0x0653)
      let stackedMeem = marks.contains(0x0651) && marks.contains(0x06E2)
      if stackedMadda { madda.append(anchor) }
      if stackedMeem { meem.append(anchor) }
      for mark in marks {
        if stackedMadda && mark == 0x0653 { continue }
        if stackedMeem && mark == 0x06E2 { continue }
        if let scalar = scalarValue(mark) { out.append(String(scalar)) }
      }
    }
    flushPause()
    return PreparedAyah(text: out as String, columns: columns, maddaAnchors: madda, smallMeemAnchors: meem)
  }

  private func scalarValue(_ codePoint: Int) -> Unicode.Scalar? {
    guard (0...0x10FFFF).contains(codePoint) else { return nil }
    return Unicode.Scalar(UInt32(codePoint))
  }

  private func isPauseMark(_ codePoint: Int) -> Bool {
    codePoint == 0x0614 || codePoint == 0x0615 || (0x06D6...0x06DC).contains(codePoint)
  }

  private func isArabicBase(_ codePoint: Int) -> Bool {
    (0x0621...0x064A).contains(codePoint) || codePoint == 0x0671 || codePoint == 0x06CC
  }

  private func isAttachedMark(_ codePoint: Int) -> Bool {
    if isPauseMark(codePoint) { return false }
    if codePoint == 0x06E2 { return true }
    guard let scalar = scalarValue(codePoint) else { return false }
    switch scalar.properties.generalCategory {
    case .nonspacingMark, .spacingMark, .enclosingMark: return true
    default: return false
    }
  }

  private func codePoint(in text: NSString, at index: Int) -> (value: Int, length: Int) {
    let unit = Int(text.character(at: index))
    if (0xD800...0xDBFF).contains(unit), index + 1 < text.length {
      let low = Int(text.character(at: index + 1))
      if (0xDC00...0xDFFF).contains(low) {
        return (((unit - 0xD800) << 10) + (low - 0xDC00) + 0x10000, 2)
      }
    }
    return (unit, 1)
  }

  private func codePointBefore(_ text: NSString, _ index: Int) -> (value: Int, length: Int)? {
    if index <= 0 || index > text.length { return nil }
    let previous = index - 1
    let unit = Int(text.character(at: previous))
    if (0xDC00...0xDFFF).contains(unit), previous > 0 {
      let high = Int(text.character(at: previous - 1))
      if (0xD800...0xDBFF).contains(high) {
        return (((high - 0xD800) << 10) + (unit - 0xDC00) + 0x10000, 2)
      }
    }
    return (unit, 1)
  }

  private func isWhitespace(_ codePoint: Int) -> Bool {
    guard let scalar = scalarValue(codePoint) else { return false }
    return CharacterSet.whitespacesAndNewlines.contains(scalar)
  }

  private func rangeCenter(_ run: DrawnRun, start: Int, end: Int) -> CGFloat {
    let safeEnd = min(max(end, start), run.text.length)
    let safeStart = min(max(0, start), safeEnd)
    let a = CGFloat(CTLineGetOffsetForStringIndex(run.line, safeStart, nil))
    let b = CGFloat(CTLineGetOffsetForStringIndex(run.line, safeEnd, nil))
    return run.originX + (a + b) / 2
  }

  private func pauseCenter(_ run: DrawnRun, anchor: Int) -> CGFloat {
    let text = run.text
    var start = min(max(0, anchor), text.length)
    var end = start
    while start > 0, let previous = codePointBefore(text, start), isWhitespace(previous.value) {
      start -= previous.length
    }
    while end < text.length {
      let (cp, len) = codePoint(in: text, at: end)
      if !isWhitespace(cp) { break }
      end += len
    }
    return rangeCenter(run, start: start, end: end)
  }

  private func drawRaisedMarks(run: DrawnRun, anchors: [Int], glyph: String, riseEm: CGFloat, glyphScale: CGFloat, color: UIColor) {
    if anchors.isEmpty || run.text.length == 0 { return }
    let size = run.font.pointSize * glyphScale
    let font = UIFont(name: run.font.fontName, size: size) ?? run.font.withSize(size)
    let inkBottom = run.baseline - run.font.pointSize * riseEm
    for anchor in anchors where anchor >= 0 && anchor < run.text.length {
      let (_, len) = codePoint(in: run.text, at: anchor)
      let x = rangeCenter(run, start: anchor, end: anchor + len)
      drawMark(glyph, font: font, color: color, centerX: x, inkBottom: inkBottom)
    }
  }

  private func drawPauseColumns(run: DrawnRun, columns: [PauseColumn], rowTop: CGFloat, color: UIColor) {
    if columns.isEmpty || run.text.length == 0 { return }
    let body = run.font.pointSize
    let columnBottom = run.baseline - body * 1.05
    let rowLimit = rowTop + 1
    let room = columnBottom - rowLimit
    let gap: CGFloat = 1
    let preferred: CGFloat = 0.62
    let floorScale: CGFloat = 0.50
    for column in columns {
      let x = pauseCenter(run, anchor: column.anchor)
      let probe = UIFont(name: run.font.fontName, size: body) ?? run.font
      var stack: CGFloat = 0
      var heights: [CGFloat] = []
      for mark in column.marks {
        let sample = scalarValue(mark).map(String.init) ?? "\u{06D6}"
        let height = max(markInk(sample, font: probe).height, body * 0.2)
        heights.append(height)
        stack += height
      }
      if heights.count > 1 { stack += gap * CGFloat(heights.count - 1) }
      let fitted = (stack > 0 && room > 0 && stack * preferred > room) ? room / stack : preferred
      let scale = min(preferred, max(floorScale, fitted))
      let font = UIFont(name: run.font.fontName, size: body * scale) ?? probe.withSize(body * scale)
      var inkBottom = columnBottom
      for mark in column.marks {
        guard let scalar = scalarValue(mark) else { continue }
        let sample = String(scalar)
        let bounds = markInk(sample, font: font)
        drawMark(sample, font: font, color: color, centerX: x, inkBottom: inkBottom)
        inkBottom -= max(bounds.height, body * scale * 0.2) + gap
      }
    }
  }

  private func markInk(_ text: String, font: UIFont) -> CGRect {
    let bounds = CTLineGetImageBounds(makeLine(text, font: font, color: .black), nil)
    if bounds.isNull || bounds.isInfinite || bounds.height < 0.5 {
      return CGRect(x: 0, y: 0, width: font.pointSize, height: font.pointSize * 0.45)
    }
    return bounds
  }

  private func drawMark(_ text: String, font: UIFont, color: UIColor, centerX: CGFloat, inkBottom: CGFloat) {
    guard let ctx = UIGraphicsGetCurrentContext() else { return }
    let line = makeLine(text, font: font, color: color)
    let bounds = markInk(text, font: font)
    let baseline = inkBottom + bounds.minY
    let originX = centerX - bounds.midX
    ctx.saveGState()
    ctx.translateBy(x: originX, y: baseline)
    ctx.scaleBy(x: 1, y: -1)
    ctx.textMatrix = .identity
    ctx.textPosition = .zero
    CTLineDraw(line, ctx)
    ctx.restoreGState()
  }

  private func drawFittedText(_ text: String, font: UIFont, color: UIColor, in box: CGRect, align: BoxAlign) {
    guard !text.isEmpty, box.width > 2, box.height > 2, let ctx = UIGraphicsGetCurrentContext() else { return }
    let (used, scale) = fitFont(text, base: font, maxWidth: box.width, maxHeight: box.height * 0.92)
    let line = makeLine(text, font: used, color: color)
    var ascent: CGFloat = 0
    var descent: CGFloat = 0
    let natural = CGFloat(CTLineGetTypographicBounds(line, &ascent, &descent, nil))
    let drawnWidth = natural * scale
    let baseline = box.midY + (ascent - descent) / 2
    let left: CGFloat
    switch align {
    case .left: left = box.minX
    case .center: left = box.midX - drawnWidth / 2
    case .right: left = box.maxX - drawnWidth
    }
    ctx.saveGState()
    ctx.translateBy(x: left, y: baseline)
    ctx.scaleBy(x: scale, y: -1)
    ctx.textMatrix = .identity
    ctx.textPosition = .zero
    CTLineDraw(line, ctx)
    ctx.restoreGState()
  }

  private func fitFont(_ text: String, base: UIFont, maxWidth: CGFloat, maxHeight: CGFloat) -> (UIFont, CGFloat) {
    var size = base.pointSize
    let floor = max(8, base.pointSize * 0.72)
    var used = base
    while size > floor {
      used = UIFont(name: base.fontName, size: size) ?? base.withSize(size)
      if measure(text, font: used) <= maxWidth && typographicHeight(text, font: used) <= maxHeight {
        return (used, 1)
      }
      size -= 0.5
    }
    while size > 8 && typographicHeight(text, font: used) > maxHeight {
      size -= 0.5
      used = UIFont(name: base.fontName, size: size) ?? base.withSize(size)
    }
    let width = max(1, measure(text, font: used))
    let scale = min(1, max(0.92, maxWidth / width))
    return (used, scale)
  }

  private func typographicHeight(_ text: String, font: UIFont) -> CGFloat {
    var ascent: CGFloat = 0
    var descent: CGFloat = 0
    CTLineGetTypographicBounds(makeLine(text, font: font, color: .black), &ascent, &descent, nil)
    return ascent + descent
  }

  /// Largest body whose ink, including the yeh bowl and tall marks, fits the row.
  private func bodySize(rowHeight: CGFloat, textWidth: CGFloat, family: String, samples: [String]) -> CGFloat {
    var size = min(rowHeight * 0.50, 29)
    let floor: CGFloat = 12
    while size > floor {
      let font = UIFont(name: family, size: size) ?? UIFont.systemFont(ofSize: size)
      let ink = inkSpan(font)
      let widest = samples.map { measure($0, font: font) }.max() ?? 0
      if ink <= rowHeight * 0.88 && widest <= textWidth { break }
      size -= 0.5
    }
    return max(floor, size)
  }

  /// Same baseline on every row: the ink box sits in the middle, with equal space above and below.
  private func letterBaseline(top: CGFloat, rowHeight: CGFloat, font: UIFont) -> CGFloat {
    let bounds = inkBounds(font)
    let ascent = max(1, bounds.maxY)
    let descent = max(1, -bounds.minY)
    let slack = max(0, rowHeight - (ascent + descent))
    return top + slack / 2 + ascent
  }

  /// Tallest mark to deepest bowl. Amiri's em box is much larger than the ink and must not set the size.
  private func inkSpan(_ font: UIFont) -> CGFloat {
    let bounds = inkBounds(font)
    return max(1, bounds.maxY - bounds.minY)
  }

  private func inkBounds(_ font: UIFont) -> CGRect {
    let sample = "بِالْهُدٰی جَقّٰي"
    return CTLineGetImageBounds(makeLine(sample, font: font, color: .black), nil)
  }

  private func makeLine(_ text: String, font: UIFont, color: UIColor) -> CTLine {
    let paragraph = NSMutableParagraphStyle()
    paragraph.baseWritingDirection = .rightToLeft
    paragraph.alignment = .right
    let attr = NSAttributedString(string: text, attributes: [
      .font: font,
      .foregroundColor: color,
      .paragraphStyle: paragraph,
      NSAttributedString.Key(kCTLanguageAttributeName as String): "ar",
    ])
    return CTLineCreateWithAttributedString(attr)
  }

  private func measure(_ text: String, font: UIFont) -> CGFloat {
    if text.isEmpty { return 0 }
    return CGFloat(CTLineGetTypographicBounds(makeLine(text, font: font, color: .black), nil, nil, nil))
  }

  private func resolvedFontName() -> String {
    if UIFont(name: fontFamily, size: 16) != nil { return fontFamily }
    if fontFamily.lowercased().contains("scheherazade") { return "Scheherazade New" }
    return "Amiri Quran"
  }

  private func arabicDigits(_ value: Int) -> String {
    let map: [Character] = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"]
    return String(String(value).map { ch -> Character in
      if let d = ch.wholeNumberValue { return map[d] }
      return ch
    })
  }

  private static func color(_ value: String?, fallback: UIColor) -> UIColor {
    guard var hex = value?.trimmingCharacters(in: .whitespacesAndNewlines), !hex.isEmpty else { return fallback }
    if hex.hasPrefix("#") { hex.removeFirst() }
    guard hex.count == 6, let n = Int(hex, radix: 16) else { return fallback }
    return UIColor(
      red: CGFloat((n >> 16) & 0xFF) / 255,
      green: CGFloat((n >> 8) & 0xFF) / 255,
      blue: CGFloat(n & 0xFF) / 255,
      alpha: 1
    )
  }
}

private enum HifzKashida {
  private static let tatweel: Character = "\u{0640}"
  private static let marks = CharacterSet(charactersIn: "\u{064B}"..."\u{065F}")
    .union(CharacterSet(charactersIn: "\u{0670}\u{06D6}\u{06D7}\u{06D8}\u{06D9}\u{06DA}\u{06DB}\u{06DC}\u{06DD}\u{06DE}\u{06DF}\u{06E0}\u{06E1}\u{06E2}\u{06E3}\u{06E4}\u{06E5}\u{06E6}\u{06E7}\u{06E8}\u{06E9}\u{06EA}\u{06EB}\u{06EC}\u{06ED}"))
  static func slots(_ text: String) -> [Int] {
    let chars = Array(text)
    var found: [Int] = []
    var i = 0
    while i < chars.count - 1 {
      // Marks sit on the same Swift character as their letter, so compare the base.
      guard let base = chars[i].unicodeScalars.first,
            carrierScalars.contains(base),
            !cannotJoinScalars.contains(base) else {
        i += 1
        continue
      }
      var j = i + 1
      while j < chars.count, isMarkCluster(chars[j]) { j += 1 }
      // A pause glued to a space is one character. It is not a letter, so no
      // tatweel may go before it — that was turning the final yeh of بالهدی into a dash.
      if j < chars.count, let next = chars[j].unicodeScalars.first,
         isJoiningLetter(next), !cannotJoinScalars.contains(next) {
        found.append(j)
      }
      i += 1
    }
    return found
  }

  private static let carrierScalars: Set<Unicode.Scalar> = Set("بتثجحخسشصضطظكلمنهفقييی".unicodeScalars)
  private static let cannotJoinScalars: Set<Unicode.Scalar> = Set("اأإآٱدذرزوؤءة".unicodeScalars)

  private static func isJoiningLetter(_ scalar: Unicode.Scalar) -> Bool {
    if scalar.value == 0x0640 { return false }
    switch scalar.value {
    case 0x0621...0x064A, 0x0671, 0x06CC: return true
    default: return false
    }
  }

  private static func isMarkCluster(_ ch: Character) -> Bool {
    !ch.unicodeScalars.isEmpty && ch.unicodeScalars.allSatisfy { marks.contains($0) }
  }

  static func apply(_ text: String, count: Int, maxPerSlot: Int) -> String {
    let points = slots(text)
    if points.isEmpty || count <= 0 { return text }
    let cap = max(1, min(12, maxPerSlot))
    var extras = min(count, points.count * cap)
    var inserts = [Int: Int]()
    var placed = 0
    while placed < extras {
      var progressed = false
      let lowest = points.map { inserts[$0] ?? 0 }.min() ?? 0
      for point in points {
        if placed >= extras { break }
        let current = inserts[point] ?? 0
        if current > lowest || current >= cap { continue }
        inserts[point] = current + 1
        placed += 1
        progressed = true
      }
      if !progressed { break }
    }
    var out = ""
    for (index, ch) in text.enumerated() {
      if let extra = inserts[index], extra > 0 {
        out.append(String(repeating: tatweel, count: extra))
      }
      out.append(ch)
    }
    return out
  }
}

@objc(Hifz16PageManager)
final class Hifz16PageManager: RCTViewManager {
  override class func moduleName() -> String! { "Hifz16PageView" }
  override class func requiresMainQueueSetup() -> Bool { true }
  override func view() -> UIView! { Hifz16PageView() }
}
