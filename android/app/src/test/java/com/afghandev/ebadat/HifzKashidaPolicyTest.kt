package com.afghandev.ebadat

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class HifzKashidaPolicyTest {
  @Test
  fun onlyStretchesAValidatedJoiningCarrierPairAndKeepsMarksAttached() {
    assertEquals(listOf(1), HifzKashidaPolicy.slots("بب").map { it.insertAt })
    assertEquals("بَـت", HifzKashidaPolicy.apply("بَت", 1))
    assertTrue(HifzKashidaPolicy.slots("بء").isEmpty())
    assertTrue(HifzKashidaPolicy.slots("اب").isEmpty())
    assertTrue(HifzKashidaPolicy.slots("لا").isEmpty())
    assertTrue(HifzKashidaPolicy.slots("ب﴿١﴾").isEmpty())
  }

  @Test
  fun neverAddsSyntheticTatweelInsideAllahIncludingVoweledAndPrefixedForms() {
    listOf("اللّٰهُ", "وَاللّٰهُ", "بِاللّٰهِ", "ءٰٓاللّٰهُ").forEach { word ->
      assertTrue("unexpected slot in $word", HifzKashidaPolicy.slots(word).isEmpty())
      assertEquals(word, HifzKashidaPolicy.apply(word, 20))
    }
    assertEquals("اللـه", HifzKashidaPolicy.apply("اللـه", 20))
    assertEquals("بـب", HifzKashidaPolicy.apply("بـب", 20))
  }

  @Test
  fun limitsEachWordAndSpreadsElongationAcrossWords() {
    val oneWord = HifzKashidaPolicy.apply("بببب", 20)
    assertEquals(4, oneWord.count { it == '\u0640' })

    val twoWords = HifzKashidaPolicy.apply("بب بب", 2)
    assertEquals(2, twoWords.count { it == '\u0640' })
    assertEquals(1, twoWords.substringBefore(' ').count { it == '\u0640' })
    assertEquals(1, twoWords.substringAfter(' ').count { it == '\u0640' })
  }

  @Test
  fun allowsAThirdTatweelOnOneWordBeforeAnyGlyphScale() {
    assertEquals(3, HifzKashidaPolicy.apply("بببب", 3).count { it == '\u0640' })
  }

  @Test
  fun keepsTheMaddaSeparatorAtOneTatweelWhileOtherWordsStillFill() {
    val alifLamMeem = "الٓمّٓ بب"
    val separated = HifzKashidaPolicy.apply(alifLamMeem, 0)
    assertEquals(1, separated.count { it == '\u0640' })
    assertTrue(separated.startsWith("الٓـمّٓ"))

    val filled = HifzKashidaPolicy.apply(alifLamMeem, 20)
    assertEquals(1, filled.substringBefore(' ').count { it == '\u0640' })
    assertEquals(4, filled.substringAfter(' ').count { it == '\u0640' })
  }

  @Test
  fun narrowerFaceMayPlaceTwiceAsManyTatweelsOnTheSameJoin() {
    assertEquals(8, HifzKashidaPolicy.apply("بببب", 20, 8).count { it == '\u0640' })
    assertEquals(4, HifzKashidaPolicy.apply("بببب", 20, 4).count { it == '\u0640' })
  }
}
