export interface JuzRange {
  juzNumber: number;
  startSurah: number;
  startAyah: number;
  startPage: number;
  endSurah: number;
  endAyah: number;
  endPage: number;
  surahCount: number;
  ayahCount: number;
}

export const JUZ_RANGES: JuzRange[] = [
  { juzNumber: 1, startSurah: 1, startAyah: 1, startPage: 1, endSurah: 2, endAyah: 141, endPage: 21, surahCount: 2, ayahCount: 148 },
  { juzNumber: 2, startSurah: 2, startAyah: 142, startPage: 22, endSurah: 2, endAyah: 252, endPage: 41, surahCount: 1, ayahCount: 111 },
  { juzNumber: 3, startSurah: 2, startAyah: 253, startPage: 42, endSurah: 3, endAyah: 92, endPage: 62, surahCount: 2, ayahCount: 126 },
  { juzNumber: 4, startSurah: 3, startAyah: 93, startPage: 62, endSurah: 4, endAyah: 23, endPage: 81, surahCount: 2, ayahCount: 131 },
  { juzNumber: 5, startSurah: 4, startAyah: 24, startPage: 82, endSurah: 4, endAyah: 147, endPage: 101, surahCount: 1, ayahCount: 124 },
  { juzNumber: 6, startSurah: 4, startAyah: 148, startPage: 102, endSurah: 5, endAyah: 81, endPage: 121, surahCount: 2, ayahCount: 110 },
  { juzNumber: 7, startSurah: 5, startAyah: 82, startPage: 121, endSurah: 6, endAyah: 110, endPage: 141, surahCount: 2, ayahCount: 149 },
  { juzNumber: 8, startSurah: 6, startAyah: 111, startPage: 142, endSurah: 7, endAyah: 87, endPage: 161, surahCount: 2, ayahCount: 142 },
  { juzNumber: 9, startSurah: 7, startAyah: 88, startPage: 162, endSurah: 8, endAyah: 40, endPage: 181, surahCount: 2, ayahCount: 159 },
  { juzNumber: 10, startSurah: 8, startAyah: 41, startPage: 182, endSurah: 9, endAyah: 92, endPage: 201, surahCount: 2, ayahCount: 127 },
  { juzNumber: 11, startSurah: 9, startAyah: 93, startPage: 201, endSurah: 11, endAyah: 5, endPage: 221, surahCount: 3, ayahCount: 151 },
  { juzNumber: 12, startSurah: 11, startAyah: 6, startPage: 222, endSurah: 12, endAyah: 52, endPage: 241, surahCount: 2, ayahCount: 170 },
  { juzNumber: 13, startSurah: 12, startAyah: 53, startPage: 242, endSurah: 14, endAyah: 52, endPage: 261, surahCount: 3, ayahCount: 154 },
  { juzNumber: 14, startSurah: 15, startAyah: 1, startPage: 262, endSurah: 16, endAyah: 128, endPage: 281, surahCount: 2, ayahCount: 227 },
  { juzNumber: 15, startSurah: 17, startAyah: 1, startPage: 282, endSurah: 18, endAyah: 74, endPage: 301, surahCount: 2, ayahCount: 185 },
  { juzNumber: 16, startSurah: 18, startAyah: 75, startPage: 302, endSurah: 20, endAyah: 135, endPage: 321, surahCount: 3, ayahCount: 269 },
  { juzNumber: 17, startSurah: 21, startAyah: 1, startPage: 322, endSurah: 22, endAyah: 78, endPage: 341, surahCount: 2, ayahCount: 190 },
  { juzNumber: 18, startSurah: 23, startAyah: 1, startPage: 342, endSurah: 25, endAyah: 20, endPage: 361, surahCount: 3, ayahCount: 202 },
  { juzNumber: 19, startSurah: 25, startAyah: 21, startPage: 362, endSurah: 27, endAyah: 55, endPage: 381, surahCount: 3, ayahCount: 339 },
  { juzNumber: 20, startSurah: 27, startAyah: 56, startPage: 382, endSurah: 29, endAyah: 45, endPage: 401, surahCount: 3, ayahCount: 171 },
  { juzNumber: 21, startSurah: 29, startAyah: 46, startPage: 402, endSurah: 33, endAyah: 30, endPage: 421, surahCount: 5, ayahCount: 178 },
  { juzNumber: 22, startSurah: 33, startAyah: 31, startPage: 422, endSurah: 36, endAyah: 27, endPage: 441, surahCount: 4, ayahCount: 169 },
  { juzNumber: 23, startSurah: 36, startAyah: 28, startPage: 442, endSurah: 39, endAyah: 31, endPage: 461, surahCount: 4, ayahCount: 357 },
  { juzNumber: 24, startSurah: 39, startAyah: 32, startPage: 462, endSurah: 41, endAyah: 46, endPage: 481, surahCount: 3, ayahCount: 175 },
  { juzNumber: 25, startSurah: 41, startAyah: 47, startPage: 482, endSurah: 45, endAyah: 37, endPage: 502, surahCount: 5, ayahCount: 246 },
  { juzNumber: 26, startSurah: 46, startAyah: 1, startPage: 502, endSurah: 51, endAyah: 30, endPage: 521, surahCount: 6, ayahCount: 195 },
  { juzNumber: 27, startSurah: 51, startAyah: 31, startPage: 522, endSurah: 57, endAyah: 29, endPage: 541, surahCount: 7, ayahCount: 399 },
  { juzNumber: 28, startSurah: 58, startAyah: 1, startPage: 542, endSurah: 66, endAyah: 12, endPage: 561, surahCount: 9, ayahCount: 137 },
  { juzNumber: 29, startSurah: 67, startAyah: 1, startPage: 562, endSurah: 77, endAyah: 50, endPage: 581, surahCount: 11, ayahCount: 431 },
  { juzNumber: 30, startSurah: 78, startAyah: 1, startPage: 582, endSurah: 114, endAyah: 6, endPage: 604, surahCount: 37, ayahCount: 564 },
];

export function getJuzRange(juzNumber: number): JuzRange | undefined {
  return JUZ_RANGES.find((item) => item.juzNumber === juzNumber);
}
