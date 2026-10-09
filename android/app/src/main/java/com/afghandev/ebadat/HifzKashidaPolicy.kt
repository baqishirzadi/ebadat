package com.afghandev.ebadat

/** Conservative, display-only elongation policy for the bundled Scheherazade font. */
internal object HifzKashidaPolicy {
  private const val TATWEEL = '\u0640'
  private const val MAX_PER_WORD = 3

  /** Letters with a well-formed, visually useful outgoing join in this mushaf font. */
  private val carriers = setOf(
    '\u0628', // beh
    '\u062A', // teh
    '\u062B', // theh
    '\u062C', // jeem
    '\u062D', // hah
    '\u062E', // khah
    '\u0633', // seen
    '\u0634', // sheen
    '\u0635', // sad
    '\u0636', // dad
    '\u0637', // tah
    '\u0638', // zah
    '\u0643', // kaf
    '\u0644', // lam
    '\u0645', // meem
    '\u0646', // noon
    '\u0647', // heh
    '\u0641', // feh
    '\u0642', // qaf
    '\u064A', // yeh
    '\u06CC', // farsi yeh used by the Indo-Pak source
  )

  /** Arabic letters that can receive a connection from the preceding logical letter. */
  private val joinsFromPrevious = setOf(
    '\u0622', '\u0623', '\u0624', '\u0625', '\u0627', '\u0629',
    '\u0628', '\u062A', '\u062B', '\u062C', '\u062D', '\u062E',
    '\u0626', '\u062F', '\u0630', '\u0631', '\u0632', '\u0633',
    '\u0634', '\u0635', '\u0636', '\u0637', '\u0638', '\u0639',
    '\u063A', '\u0641', '\u0642', '\u0643', '\u0644', '\u0645',
    '\u0646', '\u0647', '\u0648', '\u0649', '\u064A', '\u06CC',
    '\u0671',
  )

  private val alefs = setOf('\u0622', '\u0623', '\u0625', '\u0627', '\u0671')

  internal data class Slot(val insertAt: Int, val wordStart: Int, val score: Float)

  /** Valid kashida positions in UTF-16 offsets, after marks attached to the preceding letter. */
  fun slots(text: String): List<Slot> {
    if (text.length < 2) return emptyList()
    val bestByWord = linkedMapOf<Int, Slot>()
    var index = 0
    while (index < text.length) {
      val codePoint = text.codePointAt(index)
      val charCount = Character.charCount(codePoint)
      if (codePoint.toChar() !in carriers || isAllahWord(text, index)) {
        index += charCount
        continue
      }

      val nextOffset = skipTransparentMarks(text, index + charCount)
      if (nextOffset >= text.length) {
        index += charCount
        continue
      }
      val nextCodePoint = text.codePointAt(nextOffset)
      val nextChar = nextCodePoint.toChar()
      if (
        nextCodePoint != TATWEEL.code &&
        nextChar in joinsFromPrevious &&
        !(codePoint.toChar() == '\u0644' && nextChar in alefs)
      ) {
        val wordStart = findWordStart(text, index)
        if (!isAllahWord(text, wordStart)) {
          val wordEnd = findWordEnd(text, index)
          val middle = (wordStart + wordEnd) / 2f
          val score = 1f - kotlin.math.abs(index - middle) / text.length.toFloat()
          val current = bestByWord[wordStart]
          if (current == null || score > current.score) {
            bestByWord[wordStart] = Slot(nextOffset, wordStart, score)
          }
        }
      }
      index += charCount
    }
    return bestByWord.values.sortedBy { it.insertAt }
  }

  /** Add a bounded number of tatweels at spread, validated positions; source text is never mutated. */
  fun apply(text: String, count: Int): String {
    if (text.isEmpty() || count <= 0) return text
    val candidates = slots(text)
    if (candidates.isEmpty()) return text

    // Prefer one short extension in each available word before adding the
    // optional second extension to any selected word.
    val selectedCount = minOf(candidates.size, maxOf(1, count))
    val selected = selectSpreadSlots(candidates, selectedCount)
    val budget = minOf(count, selected.size * MAX_PER_WORD)
    if (budget == 0) return text

    val inserts = mutableMapOf<Int, Int>()
    var placed = 0
    while (placed < budget) {
      var progressed = false
      for (slot in selected) {
        if (placed >= budget) break
        val current = inserts[slot.insertAt] ?: 0
        if (current >= MAX_PER_WORD) continue
        inserts[slot.insertAt] = current + 1
        placed += 1
        progressed = true
      }
      if (!progressed) break
    }

    val output = StringBuilder(text.length + placed)
    var offset = 0
    while (offset < text.length) {
      val extra = inserts[offset] ?: 0
      repeat(extra) { output.append(TATWEEL) }
      val codePoint = text.codePointAt(offset)
      output.appendCodePoint(codePoint)
      offset += Character.charCount(codePoint)
    }
    return output.toString()
  }

  private fun selectSpreadSlots(slots: List<Slot>, count: Int): List<Slot> {
    if (slots.size <= count) return slots
    val selected = ArrayList<Slot>(count)
    for (sliceIndex in 0 until count) {
      val start = sliceIndex * slots.size / count
      val end = maxOf(start + 1, (sliceIndex + 1) * slots.size / count)
      selected += slots.subList(start, minOf(end, slots.size)).maxBy { it.score }
    }
    return selected.sortedBy { it.insertAt }
  }

  private fun skipTransparentMarks(text: String, from: Int): Int {
    var index = from
    while (index < text.length) {
      val codePoint = text.codePointAt(index)
      if (!isTransparentMark(codePoint)) break
      index += Character.charCount(codePoint)
    }
    return index
  }

  private fun isTransparentMark(codePoint: Int): Boolean {
    val type = Character.getType(codePoint)
    return type == Character.NON_SPACING_MARK.toInt() ||
      type == Character.COMBINING_SPACING_MARK.toInt() ||
      type == Character.ENCLOSING_MARK.toInt() ||
      codePoint in 0x06D6..0x06ED ||
      codePoint in 0x08D3..0x08FF
  }

  private fun findWordStart(text: String, offset: Int): Int {
    var index = offset
    while (index > 0) {
      val previous = text.codePointBefore(index)
      if (Character.isWhitespace(previous) || previous == 0x00A0 || previous == 0xFD3F) break
      index -= Character.charCount(previous)
    }
    return index
  }

  private fun findWordEnd(text: String, offset: Int): Int {
    var index = offset
    while (index < text.length) {
      val codePoint = text.codePointAt(index)
      if (Character.isWhitespace(codePoint) || codePoint == 0x00A0 || codePoint == 0xFD3E || codePoint == 0xFD3F) break
      index += Character.charCount(codePoint)
    }
    return index
  }

  private fun isAllahWord(text: String, offset: Int): Boolean {
    val start = findWordStart(text, offset)
    val end = findWordEnd(text, offset)
    val normalized = buildString {
      var index = start
      while (index < end) {
        val codePoint = text.codePointAt(index)
        if (!isTransparentMark(codePoint) && codePoint != TATWEEL.code) {
          appendCodePoint(if (codePoint == 0x0671) 0x0627 else codePoint)
        }
        index += Character.charCount(codePoint)
      }
    }
    return normalized.contains("الله")
  }
}
