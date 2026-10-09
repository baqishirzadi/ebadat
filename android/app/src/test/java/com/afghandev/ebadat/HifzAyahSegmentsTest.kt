package com.afghandev.ebadat

import org.junit.Assert.assertEquals
import org.junit.Test

class HifzAyahSegmentsTest {
  @Test
  fun splitsMultipleAyahsAndKeepsTheAyahMarkerWithItsVerse() {
    val text = "الٓمّٓ ﴿١﴾ ذٰلِكَ الْكِتٰبُ ﴿٢﴾ لَا رَیْبَ"

    assertEquals(
      listOf("الٓمّٓ ﴿١﴾", " ذٰلِكَ الْكِتٰبُ ﴿٢﴾", " لَا رَیْبَ"),
      HifzAyahSegments.split(text, 1, 2).map { text.substring(it.start, it.end) },
    )
  }

  @Test
  fun assignsUnmarkedContinuationToTheLineAyah() {
    assertEquals(
      listOf(4),
      HifzAyahSegments.split("بِمَاۤ اُنْزِلَ", 4, 4).map { it.ayah },
    )
  }

  @Test
  fun acceptsArabicPersianAndAsciiMarkerDigits() {
    val text = "ا ﴿١٢﴾ ب ﴿۱۳﴾ ج ﴿14﴾"
    assertEquals(listOf(12, 13, 14), HifzAyahSegments.split(text, 1, 14).map { it.ayah })
  }
}
