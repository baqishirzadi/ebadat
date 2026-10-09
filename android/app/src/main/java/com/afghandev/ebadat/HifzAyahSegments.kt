package com.afghandev.ebadat

/** Text ranges in a printed line that belong to one Quran ayah. */
internal data class HifzAyahSegment(
  val start: Int,
  val end: Int,
  val ayah: Int,
)

/** Splits the same ayah-marker convention used by the React Native renderer. */
internal object HifzAyahSegments {
  private val marker = Regex("﴿([٠-٩۰-۹0-9]+)﴾")

  fun split(text: String, ayahStart: Int?, ayahEnd: Int?): List<HifzAyahSegment> {
    if (text.isEmpty()) return emptyList()
    val startAyah = ayahStart ?: ayahEnd ?: return emptyList()
    val matches = marker.findAll(text).toList()
    if (matches.isEmpty()) return listOf(HifzAyahSegment(0, text.length, startAyah))

    val result = ArrayList<HifzAyahSegment>(matches.size + 1)
    var lastIndex = 0
    for (match in matches) {
      val end = match.range.last + 1
      val ayah = parseDigits(match.groupValues[1]) ?: startAyah
      result += HifzAyahSegment(lastIndex, end, ayah)
      lastIndex = end
    }
    if (lastIndex < text.length) {
      val tailAyah = ayahEnd ?: parseDigits(matches.last().groupValues[1]) ?: startAyah
      result += HifzAyahSegment(lastIndex, text.length, tailAyah)
    }
    return result
  }

  private fun parseDigits(value: String): Int? {
    var result = 0
    for (char in value) {
      val digit = when (char) {
        in '٠'..'٩' -> char - '٠'
        in '۰'..'۹' -> char - '۰'
        in '0'..'9' -> char - '0'
        else -> return null
      }
      result = result * 10 + digit
    }
    return result.takeIf { it > 0 }
  }
}
