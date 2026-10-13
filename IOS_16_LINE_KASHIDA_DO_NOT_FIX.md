# Quran 16-line iOS stretch

iPhone does not stretch 16-line ayahs with React Native `Text` and U+0640. That path is closed.

iOS pages are drawn by `ios/abadt/Hifz16PageView.swift` through `Hifz16PageView`, the same native component name as Android. Core Text justifies the line (`CTLineCreateJustifiedLine`) and leftover width is filled with tatweel measured in Core Text.

Do not go back to `JustifiedAyahText` / `HifzPageCard` for the numbered mushaf pages on iOS.
