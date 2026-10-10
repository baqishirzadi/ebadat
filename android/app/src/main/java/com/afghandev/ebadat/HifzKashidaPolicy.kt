package com.afghandev.ebadat

/** Even, short tatweels for the bundled Amiri Quran face. */
internal object HifzKashidaPolicy {
  private const val TATWEEL = '\u0640'
  private const val MAX_PER_WORD = 4
  private const val SHADDA = 0x0651
  private const val MADDA = 0x0653

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

  /** One join per word, the most central eligible carrier. */
  fun slots(text: String): List<Slot> {
    val bestByWord = linkedMapOf<Int, Slot>()
    for (slot in allJoins(text)) {
      val current = bestByWord[slot.wordStart]
      if (current == null || slot.score > current.score) bestByWord[slot.wordStart] = slot
    }
    return bestByWord.values.sortedBy { it.insertAt }
  }

  /**
   * Place `count` tatweels, spread so every chosen word stays within one of
   * the others. A madda that would meet a later shadda or madda keeps one
   * tatweel on the join between them even when count is 0.
   */
  fun apply(text: String, count: Int, maxPerWord: Int = MAX_PER_WORD): String {
    if (text.isEmpty()) return text
    val cap = maxPerWord.coerceIn(1, 12)
    val wordSlots = slots(text)
    val required = requiredInserts(text)
    if (wordSlots.isEmpty() && required.isEmpty()) return text

    val selected = linkedMapOf<Int, Slot>()
    for (slot in wordSlots) selected[slot.insertAt] = slot
    for (insertAt in required.keys) {
      if (insertAt !in selected) {
        selected[insertAt] = Slot(insertAt, findWordStart(text, insertAt), 0f)
      }
    }
    val ordered = selected.values.sortedBy { it.insertAt }
    val floor = required.values.sum()
    // The separating join stays at one tatweel. The fill uses the other joins.
    val fill = ordered.filter { it.insertAt !in required }
    val extras = minOf(maxOf(count - floor, 0), fill.size * cap)
    if (floor == 0 && extras == 0) return text

    val inserts = required.toMutableMap()
    var placed = 0
    while (placed < extras && fill.isNotEmpty()) {
      val lowest = fill.minOf { inserts[it.insertAt] ?: 0 }
      var progressed = false
      for (slot in fill) {
        if (placed >= extras) break
        val current = inserts[slot.insertAt] ?: 0
        if (current > lowest || current >= cap) continue
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

  /** Every valid join, including more than one inside a single word. */
  private fun allJoins(text: String): List<Slot> {
    if (text.length < 2) return emptyList()
    val joins = mutableListOf<Slot>()
    var index = 0
    while (index < text.length) {
      val codePoint = text.codePointAt(index)
      val charCount = Character.charCount(codePoint)
      if (codePoint.toChar() !in carriers || isAllahWord(text, index)) {
        index += charCount
        continue
      }

      val nextOffset = skipTransparentMarks(text, index + charCount)
      if (nextOffset >= text.length || hasPauseMark(text, index + charCount, nextOffset)) {
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
          joins += Slot(nextOffset, wordStart, score)
        }
      }
      index += charCount
    }
    return joins
  }

  private data class LetterBase(val offset: Int, val marks: List<Int>)

  /**
   * One tatweel on the first join between a madda and a shadda or madda on
   * one of the next two letters. That is what separates الف from م in الم.
   */
  private fun requiredInserts(text: String): Map<Int, Int> {
    val bases = letterBases(text)
    if (bases.size < 2) return emptyMap()
    val joins = allJoins(text)
    if (joins.isEmpty()) return emptyMap()
    val result = linkedMapOf<Int, Int>()
    for (index in bases.indices) {
      if (MADDA !in bases[index].marks) continue
      val last = minOf(bases.lastIndex, index + 2)
      for (next in index + 1..last) {
        val marks = bases[next].marks
        if (SHADDA !in marks && MADDA !in marks) continue
        val join = joins.firstOrNull {
          it.insertAt > bases[index].offset && it.insertAt <= bases[next].offset
        }
        if (join != null) result.putIfAbsent(join.insertAt, 1)
        break
      }
    }
    return result
  }

  private fun letterBases(text: String): List<LetterBase> {
    val bases = mutableListOf<LetterBase>()
    var index = 0
    while (index < text.length) {
      val codePoint = text.codePointAt(index)
      if (!isBaseLetter(codePoint)) {
        index += Character.charCount(codePoint)
        continue
      }
      val offset = index
      index += Character.charCount(codePoint)
      val marks = mutableListOf<Int>()
      while (index < text.length) {
        val mark = text.codePointAt(index)
        if (!isTransparentMark(mark)) break
        marks += mark
        index += Character.charCount(mark)
      }
      bases += LetterBase(offset, marks)
    }
    return bases
  }

  private fun isBaseLetter(codePoint: Int): Boolean =
    codePoint in 0x0621..0x064A || codePoint == 0x0671 || codePoint == 0x06CC

  private fun skipTransparentMarks(text: String, from: Int): Int {
    var index = from
    while (index < text.length) {
      val codePoint = text.codePointAt(index)
      if (!isTransparentMark(codePoint)) break
      index += Character.charCount(codePoint)
    }
    return index
  }

  /** A pause cluster between the carrier and the next letter is not a kashida site. */
  private fun hasPauseMark(text: String, from: Int, until: Int): Boolean {
    var index = from
    while (index < until && index < text.length) {
      val codePoint = text.codePointAt(index)
      if (codePoint == 0x0614 || codePoint == 0x0615 || codePoint in 0x06D6..0x06DC) return true
      index += Character.charCount(codePoint)
    }
    return false
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
