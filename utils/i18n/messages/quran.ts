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
  'quran.download.action': { dari: 'دانلود', pashto: 'ښکته کول', english: 'Download' },
  'quran.download.ready': { dari: 'آماده دانلود', pashto: 'د ښکته کولو لپاره چمتو', english: 'Ready to download' },
  'quran.download.progress': { dari: '{done} از {total}', pashto: '{done} له {total}', english: '{done} of {total}' },
  'quran.download.cancel': { dari: 'لغو', pashto: 'لغوه', english: 'Cancel' },
  'quran.download.changeReciter': { dari: 'تغییر قاری', pashto: 'قاري بدلول', english: 'Change reciter' },
  'quran.download.failed': {
    dari: 'دانلود کامل نشد. اینترنت و فضای ذخیره‌سازی را بررسی کنید.',
    pashto: 'ښکته کول بشپړ نه شول. انټرنټ او د ذخیرې ځای وګورئ.',
    english: 'The download did not finish. Check your connection and storage.',
  },
  'quran.hifz16.label': { dari: '۱۶ خطه', pashto: '۱۶ کرښه', english: '16-line' },
  'quran.hifz16.hint': {
    dari: 'مصحف ۱۶ خطه برای حفظ — بدون ترجمه',
    pashto: 'د حفظ لپاره ۱۶ کرښیز مصحف — بې ژباړې',
    english: '16-line hifz mushaf — no translation',
  },
} as const satisfies Record<string, UiMessage>;
