# Quran tab — 16-line reader bug report

Device where this is visible: Samsung Galaxy S24 Ultra, `adb` serial `R3CWC0ACVRT`, screen 1440×3120. Package `com.afghandev.ebadat`. Debug APK only. Do not build an AAB. Do not wipe app data. Do not discard unrelated uncommitted git changes.

The reader must look and behave like a normal Indo-Pak 16-line mushaf. Three things are broken on the phone right now.

## 1. Opening a surah shows a blank page until the user touches it

**What the user sees**

- In the Quran tab, tap a surah (for example Al-Baqarah).
- A blank page opens. The frame is empty.
- The moment the user touches or swipes the page, the real text appears.

**What also happens on mode switch**

- Open surah 1 in 16-line mode (page 1, Al-Fatiha). That first open can be correct.
- Switch to Translation, then switch back to 16-line.
- The reader does not stay on Al-Fatiha. On the phone it jumped to mushaf page 546 (Surah Al-Fil, juz 30). Header changed to `سورة الفيل`. Footer showed `٥٤٦ / ٥٤٨`.
- Switching modes must never send the user to the end of the mushaf.

**Expected**

- Tapping a surah opens that surah’s first real mushaf page, fully drawn, on the first frame. No blank canvas, no flash of page 548 / 546.
- Translation ↔ 16-line keeps the same surah and the same ayah (and therefore the same 16-line page). It must not remount onto the last pages.

**Why this happens**

`components/quran/Hifz16View.tsx` renders one horizontal `FlatList` whose data is descending:

- index `0` = mushaf page **548**
- index `547` = mushaf page **1**
- index `548` = the dedication leaf

`pageIndex(page) = 548 - page`.

Android RTL reverses `HorizontalScrollView`, and the list is also mirrored with `scaleX: -1` (`UNMIRROR_RTL`) so the native canvas text stays upright. Native dragging is disabled (`scrollEnabled={false}` on Android). A `PanResponder` drives `scrollToOffset` by hand.

`initialScrollIndex` does not reliably land. The first cells that exist are the end of the mushaf (pages 548, 547, 546). Until a later `scrollToOffset` actually sticks, the user sees either:

- a blank gap (the list has not measured / the opening scroll has not landed), which fills in on the first touch, or
- a real but wrong page near 548. Viewability then adopts that page and rewrites the header surah.

A retry loop and a measured list width were added in `Hifz16View.tsx` (`suppressViewabilityRef`, `measuredPageWidth`, `scrollToOffset`). They are not a fix. The phone still opens blank, and the Maestro flow `.maestro/android-quran-hifz16.yaml` still failed at `hifz16-page-1` after Translation → 16-line, with page 546 on screen.

Do not paper over this with a longer retry. The opening offset must be correct before the first paint, and viewability must not adopt page 546–548 while the requested page is page 1 or page 2.

Relevant route code: `app/quran/[surah].tsx`. The 16-line view is keyed and remounted on mode changes (`forcedHifzPage`, `hifz16Line`). `SurahList` pushes `/quran/{n}?ayah=1&hifzPage={startPage}`. `getHifzSurahStartPage(2)` is page 2. Baqarah must open on page 2, not on a blank leaf and not on page 548.

Audio from a different surah used to drag the reader to that surah’s page. `syncFromAudioSnapshot` now follows audio only when `snapshot.surah === surahNumber`. Keep that gate. It is not the blank-page bug.

## 2. Bismillah on surah headings is wrong

**What the user sees**

The bismillah on surah headings in 16-line mode looks broken: too small, crushed, or not like a printed mushaf line. This is on the surahs that do not already have their own bismillah row in the page data.

**What the code does now**

`Hifz16PageView.kt`, `needsInlineBismillah` + draw loop:

- If the line type is `surah_name`, the surah is not 1 or 9, and the next non-spacer line is not already `basmallah`, the view concatenates the surah name and a hardcoded string onto one baseline:

  `INLINE_BISMILLAH = "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِیْمِ"`

  `sourceText = "${line.text}  $INLINE_BISMILLAH"`

- That whole string is then passed through `fitCentered` with `minScale = 0.55`, so `textScaleX` can shrink the heading to 55% width. The glyphs become small and distorted.

**Expected**

- A heading must look like a standard 16-line page: readable, normal letter size, correct Indo-Pak shapes, not a horizontally squashed sentence.
- Surahs that already have a `basmallah` row in `data/hifz16-pages.json` (including the real bismillah line on page 2) must keep that row. Do not draw a second bismillah.
- Surah 9 (At-Tawbah) has no bismillah. Do not add one.
- Surah 1’s bismillah is ayah 1. Do not add an extra one.
- Do not invent ayah text. Do not copy another page’s lines onto a short page. Only the heading line that the source left without a bismillah row needs a proper bismillah, at a normal size.

## 3. Some last ayahs are far too big

**What the user sees**

On many pages, the last ayah of a surah (a short centered closing line) is stretched much larger than the lines above it.

**What the code does now**

In `Hifz16PageView.kt` draw loop:

1. A centered ayah is forced to justify when its natural width is at least 28% of the row (`textWidth * 0.28f`).
2. `stretchToWidth` adds tatweel (kashida, U+0640, max 2 per word via `HifzKashidaPolicy`).
3. Whatever width is still missing is filled by:

   `arabicPaint.textScaleX = (textWidth / measured).coerceIn(0.88f, 1.55f)`

A short last line cannot be filled with two tatweels per word, so scale goes up toward **1.55**. The line becomes huge. That cap was raised on purpose to hide gaps at the ends of full lines. It overshot. Full lines in juz 29–30 (pages 522 and 543 were called out) should meet the frame inset. Short closing lines must stay centered at the same font size as the rest of the page.

**Expected**

- A normal ayah line is justified with kashida. A small residual `textScaleX` is acceptable only when the line is already almost full (keep it near 1.0, not 1.55).
- A short last ayah stays centered, normal size, not stretched.
- Real blank slots (page 1 and 2 spacers in the JSON, and the empty part of page 548 after An-Nas) stay empty. Do not duplicate text to fill them.
- Pages 1 and 2 are short leaves in the source (page 2 is the surah name, its own bismillah, ayahs 2:1–2:4, then spacers). Spreading those real lines down the frame is fine. Do not paste page 3’s text onto page 2.

## Files

- `components/quran/Hifz16View.tsx` — list order, RTL mirror, opening scroll, viewability, swipe.
- `android/app/src/main/java/com/afghandev/ebadat/Hifz16PageView.kt` — drawing, bismillah, `textScaleX`, kashida.
- `android/app/src/main/java/com/afghandev/ebadat/HifzKashidaPolicy.kt`
- `app/quran/[surah].tsx` — mode switch, `forcedHifzPage`, audio follow.
- `components/quran/SurahList.tsx` — tap opens `/quran/{n}?ayah=1&hifzPage=…`
- `data/hifz16-pages.json` — source of lines. Do not reflow it to hide a drawing bug.
- `.maestro/android-quran-hifz16.yaml` — phone flow. A rightward swipe (20% → 80%) must open the next page. A leftward swipe returns. Do not flip that back.

## Swipe direction (do not regress)

On the phone, a finger moving to the right opens the next mushaf page. A finger moving to the left goes back toward page 1. The page must follow the finger. Current math in the pan responder: `offset = anchor - gesture.dx`, and on release `gesture.dx > 0` means next page. Maestro already expects that. Leave it.

## How to check on the phone

1. `cd android && ./gradlew :app:assembleDebug`
2. `adb -s R3CWC0ACVRT install -r app/build/outputs/apk/debug/app-debug.apk`
3. By hand, on that phone:
   - Quran tab → Al-Baqarah. Page 2 must be visible immediately, not a blank page, not page 548.
   - Touch is not required to “wake” the text.
   - One swipe each way stays on neighboring pages.
   - Translation → 16-line on Al-Fatiha stays on page 1.
   - A surah heading that has no bismillah row shows a normal-size bismillah, not a 55%-scaled string.
   - A short last ayah is the same size as the other lines and stays centered.
   - Pages 522 and 543: full lines meet the frame; they are not blown up.
4. Then `MAESTRO_CLI_NO_ANALYTICS=1 maestro --device R3CWC0ACVRT test .maestro/android-quran-hifz16.yaml` and the reader flow `.maestro/android-quran-reader.yaml`.
