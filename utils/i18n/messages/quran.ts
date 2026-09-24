import type { UiMessage } from '../messageType';

/** Copy owned by the quran screens. Keys are namespaced so this file can grow
 * without touching the shared catalog. */
export const quranMessages = {
  'quran.mode.surah': { dari: 'سوره', pashto: 'سورت', english: 'Surah' },
  'quran.mode.juz': { dari: 'جزء', pashto: 'پاره', english: 'Juz' },
  'quran.search.surahPlaceholder': { dari: 'جستجوی سوره...', pashto: 'د سورت لټون...', english: 'Search surahs…' },
  'quran.search.juzPlaceholder': { dari: 'جستجوی جزء...', pashto: 'د پارې لټون...', english: 'Search juz…' },
  // The printed Mushaf page keeps its Arabic caption in Dari and Pashto.
  'quran.mushaf.juz': { dari: 'الجزء {number}', pashto: 'الجزء {number}', english: 'Juz {number}' },
  'quran.surahNotFound': { dari: 'سوره یافت نشد', pashto: 'سورت ونه موندل شو', english: 'Surah not found' },
  'quran.jump.exactFailed': {
    dari: 'رفتن دقیق به آیه انجام نشد.',
    pashto: 'آیت ته سم ورسېدنه ونه شوه.',
    english: 'Could not jump to that ayah.',
  },
  'quran.jump.searchFailed': {
    dari: 'رفتن به نتیجه جستجو انجام نشد.',
    pashto: 'د لټون پایلې ته ورسېدنه ونه شوه.',
    english: 'Could not jump to the search result.',
  },
  'quran.audio.playAyah': { dari: 'پخش آیه', pashto: 'آیت غږول', english: 'Play ayah' },
  'quran.translation.label': { dari: 'ترجمه', pashto: 'ژباړه', english: 'Translation' },
  'quran.showTranslation': { dari: 'نمایش ترجمه', pashto: 'ژباړه ښکاره کول', english: 'Show translation' },
} as const satisfies Record<string, UiMessage>;
