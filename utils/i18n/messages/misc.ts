import type { UiMessage } from '../messageType';

/** Copy owned by the misc screens. Keys are namespaced so this file can grow
 * without touching the shared catalog. */
export const miscMessages = {
  // Adhkar
  'adhkar.title': { dari: 'اذکار', pashto: 'اذکار', english: 'Adhkar' },
  'adhkar.count': { dari: '{count} ذکر', pashto: '{count} ذکرونه', english: '{count} adhkar' },

  // Jantari (Islamic calendar hub)
  'jantari.title': { dari: 'جنتری', pashto: 'جنتري', english: 'Calendar' },
  'jantari.section.calendar': { dari: 'تقویم', pashto: 'کلیز', english: 'Calendar' },
  'jantari.section.events': { dari: 'مناسبت‌ها', pashto: 'مناسبتونه', english: 'Occasions' },
  'jantari.section.countdown': { dari: 'شمارش معکوس', pashto: 'شاته شمېرنه', english: 'Countdown' },

  // AI chat screens
  'chat.dream.title': {
    dari: 'تعبیر خواب اسلامی',
    pashto: 'اسلامي خوب تعبیر',
    english: 'Islamic dream interpretation',
  },
  'chat.mufti.starter.dhuhrRakats': {
    dari: 'نماز ظهر چند رکعت است؟',
    pashto: 'د ماسپښین لمونځ څو رکعته دی؟',
    english: 'How many rak‘ahs is the Dhuhr prayer?',
  },
  'chat.mufti.starter.goldZakat': {
    dari: 'زکات طلا چگونه محاسبه می‌شود؟',
    pashto: 'د سرو زرو زکات څنګه حسابېږي؟',
    english: 'How is zakat on gold calculated?',
  },
  'chat.mufti.starter.parentsRights': {
    dari: 'حق والدین بر فرزندان چیست؟',
    pashto: 'پر اولادونو د مور او پلار حق څه دی؟',
    english: 'What rights do parents have over their children?',
  },
  'chat.mufti.starter.supporters': {
    dari: 'حامیان این برنامه کیستند؟',
    pashto: 'د دې اپ ملاتړ کوونکي څوک دي؟',
    english: 'Who supports this app?',
  },
  'chat.mufti.starter.creator': {
    dari: 'سازنده این برنامه کیست؟',
    pashto: 'دا اپ چا جوړ کړی؟',
    english: 'Who made this app?',
  },
  'chat.mufti.starter.travellerPrayer': {
    dari: 'نماز مسافر چند رکعت است؟',
    pashto: 'د مسافر لمونځ څو رکعته دی؟',
    english: 'How many rak‘ahs does a traveller pray?',
  },

  // Bookmarks
  'bookmarks.title': { dari: 'نشانه‌ها', pashto: 'نښې', english: 'Bookmarks' },
  'bookmarks.savedCount': {
    dari: '{count} نشانه ذخیره شده',
    pashto: '{count} ساتل شوې نښې',
    english: '{count} saved bookmarks',
  },
  'bookmarks.noneSaved': {
    dari: 'هیچ نشانه‌ای ذخیره نشده',
    pashto: 'هېڅ نښه نه ده ساتل شوې',
    english: 'No bookmarks saved',
  },
  'bookmarks.emptyTitle': {
    dari: 'هیچ نشانه‌ای ندارید',
    pashto: 'تاسو هېڅ نښه نه لرئ',
    english: 'You have no bookmarks',
  },
  'bookmarks.emptyBody': {
    dari: 'آیات مورد علاقه خود را نشانه‌گذاری کنید تا بعداً به آنها دسترسی داشته باشید',
    pashto: 'خپل خوښ آیتونه ونښلوئ، څو وروسته ورته اسانه لاسرسی ولرئ',
    english: 'Bookmark the ayahs you love so you can find them again later',
  },
  'bookmarks.delete.title': { dari: 'حذف نشانه', pashto: 'نښه ړنګول', english: 'Delete bookmark' },
  'bookmarks.delete.body': {
    dari: 'آیا می‌خواهید نشانه سوره {surah} آیه {ayah} را حذف کنید؟',
    pashto: 'غواړئ د {surah} سورت د {ayah} آیت نښه ړنګه کړئ؟',
    english: 'Delete the bookmark for Surah {surah}, ayah {ayah}?',
  },
  'bookmarks.page': { dari: 'صفحه {page}', pashto: '{page} مخ', english: 'Page {page}' },

  // Quran search
  'search.mode.arabic': { dari: 'عربی', pashto: 'عربي', english: 'Arabic' },
  'search.mode.all': { dari: 'همه', pashto: 'ټول', english: 'All' },
  'search.placeholder.arabic': {
    dari: 'جستجو در متن عربی...',
    pashto: 'په عربي متن کې لټون...',
    english: 'Search the Arabic text…',
  },
  'search.placeholder.dari': {
    dari: 'جستجو در ترجمه دری...',
    pashto: 'د دري ژباړې لټون...',
    english: 'Search the Dari translation…',
  },
  'search.placeholder.pashto': {
    dari: 'جستجو در ترجمه پشتو...',
    pashto: 'د پښتو ژباړې لټون...',
    english: 'Search the Pashto translation…',
  },
  'search.placeholder.all': {
    dari: 'جستجو در عربی و ترجمه‌ها...',
    pashto: 'په عربي او ژباړو کې لټون...',
    english: 'Search Arabic and the translations…',
  },
  'search.failed': {
    dari: 'جستجو انجام نشد. دوباره تلاش کنید.',
    pashto: 'لټون ونه شو. بیا هڅه وکړئ.',
    english: 'The search could not be completed. Please try again.',
  },
  'search.inProgress': { dari: 'در حال جستجو...', pashto: 'لټون روان دی...', english: 'Searching…' },
  'search.resultsCount': {
    dari: '{count} نتیجه یافت شد',
    pashto: '{count} پایلې وموندل شوې',
    english: '{count} results found',
  },
  'search.noResults': {
    dari: 'نتیجه‌ای یافت نشد',
    pashto: 'هېڅ پایله ونه موندل شوه',
    english: 'No results found',
  },
  'search.tryAnother': {
    dari: 'عبارت دیگری را امتحان کنید',
    pashto: 'بله کلمه وازمویئ',
    english: 'Try a different phrase',
  },
  'search.prompt.title': {
    dari: 'جستجو در قرآن',
    pashto: 'په قرآن کې لټون',
    english: 'Search the Quran',
  },
  'search.prompt.body': {
    dari: 'عربی، دری یا پښتو — حداقل ۲ حرف وارد کنید',
    pashto: 'عربي، دري یا پښتو — لږ تر لږه ۲ توري ولیکئ',
    english: 'Arabic, Dari or Pashto — enter at least 2 letters',
  },
  'search.surahNumber': { dari: 'سوره {number}', pashto: '{number} سورت', english: 'Surah {number}' },

  // Settings
  'settings.adhan.subtitle': {
    dari: 'صدای اذان و یادآوری برای هر نماز',
    pashto: 'د هر لمانځه د اذان غږ او یادونه',
    english: 'Adhan sound and reminder for each prayer',
  },
  'settings.asrNotice': {
    dari: 'وقت عصر بر اساس مذهب حنفی محاسبه می‌شود (سایه دو برابر)',
    pashto: 'د مازدیګر وخت د حنفي مذهب له مخې محاسبه کېږي (دوه برابره سیوری)',
    english: 'Asr is calculated according to the Hanafi school (shadow length doubled)',
  },
  'settings.method.karachi': { dari: 'کراچی (حنفی)', pashto: 'کراچۍ (حنفي)', english: 'Karachi (Hanafi)' },
  'settings.method.mwl': {
    dari: 'رابطه عالم اسلامی',
    pashto: 'د اسلامي نړۍ اتحادیه',
    english: 'Muslim World League',
  },
  'settings.method.isna': { dari: 'آمریکای شمالی', pashto: 'شمالي امریکا', english: 'North America (ISNA)' },
  'settings.method.egypt': { dari: 'مصر', pashto: 'مصر', english: 'Egypt' },
  'settings.method.makkah': { dari: 'ام‌القری مکه', pashto: 'ام القرى مکه', english: 'Umm al-Qura, Makkah' },
  'settings.method.tehran': { dari: 'تهران', pashto: 'تهران', english: 'Tehran' },

  // Home widgets
  'widget.adhanStatus.title': { dari: 'وضعیت اذان', pashto: 'د اذان حالت', english: 'Adhan status' },
  'widget.adhanStatus.permissionTitle': {
    dari: 'دسترسی اعلان‌ها',
    pashto: 'د خبرتیاوو اجازه',
    english: 'Notification access',
  },
  'widget.adhanStatus.permissionBody': {
    dari: 'برای فعال‌کردن اعلان‌های اذان، به Settings → Apps → Ebadat → Notifications بروید و Allow Notifications را روشن کنید.',
    pashto: 'د اذان د خبرتیاوو فعالولو لپاره Settings → Apps → Ebadat → Notifications ته لاړ شئ او Allow Notifications فعال کړئ.',
    english: 'To turn on Adhan notifications, go to Settings → Apps → Ebadat → Notifications and switch on Allow Notifications.',
  },
  'widget.ok': { dari: 'باشه', pashto: 'سمه ده', english: 'OK' },
} as const satisfies Record<string, UiMessage>;
