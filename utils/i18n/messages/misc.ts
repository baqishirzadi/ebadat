import type { UiMessage } from '../messageType';

/** Copy owned by the misc screens. Keys are namespaced so this file can grow
 * without touching the shared catalog. */
export const miscMessages = {
  // Adhkar
  'adhkar.title': { dari: 'اذکار', pashto: 'اذکار', english: 'Adhkar', turkish: 'Zikirler', arabic: 'أذكار' },
  'adhkar.count': { dari: '{count} ذکر', pashto: '{count} ذکرونه', english: '{count} adhkar', turkish: '{count} zikir', arabic: '{count} ذكر' },

  // Jantari (Islamic calendar hub)
  'jantari.title': { dari: 'جنتری', pashto: 'جنتري', english: 'Calendar', turkish: 'Takvim', arabic: 'التقويم' },
  'jantari.section.calendar': { dari: 'تقویم', pashto: 'کلیز', english: 'Calendar', turkish: 'Takvim', arabic: 'التقويم' },
  'jantari.section.events': { dari: 'مناسبت‌ها', pashto: 'مناسبتونه', english: 'Occasions', turkish: 'Özel günler', arabic: 'المناسبات' },
  'jantari.section.countdown': { dari: 'شمارش معکوس', pashto: 'شاته شمېرنه', english: 'Countdown', turkish: 'Geri sayım', arabic: 'العد التنازلي' },

  // AI chat screens
  'chat.dream.title': {
    dari: 'تعبیر خواب اسلامی',
    pashto: 'اسلامي خوب تعبیر',
    english: 'Islamic dream interpretation',
    turkish: 'İslami rüya tabiri',
    arabic: 'تفسير الأحلام الإسلامي',
  },
  'chat.mufti.starter.dhuhrRakats': {
    dari: 'نماز ظهر چند رکعت است؟',
    pashto: 'د ماسپښین لمونځ څو رکعته دی؟',
    english: 'How many rak‘ahs is the Dhuhr prayer?',
    turkish: 'Öğle namazı kaç rekâttır?',
    arabic: 'كم ركعة صلاة الظهر؟',
  },
  'chat.mufti.starter.goldZakat': {
    dari: 'زکات طلا چگونه محاسبه می‌شود؟',
    pashto: 'د سرو زرو زکات څنګه حسابېږي؟',
    english: 'How is zakat on gold calculated?',
    turkish: 'Altın zekâtı nasıl hesaplanır?',
    arabic: 'كيف تُحسب زكاة الذهب؟',
  },
  'chat.mufti.starter.parentsRights': {
    dari: 'حق والدین بر فرزندان چیست؟',
    pashto: 'پر اولادونو د مور او پلار حق څه دی؟',
    english: 'What rights do parents have over their children?',
    turkish: 'Anne babanın çocukları üzerindeki hakları nelerdir?',
    arabic: 'ما حق الوالدين على الأبناء؟',
  },
  'chat.mufti.starter.supporters': {
    dari: 'حامیان این برنامه کیستند؟',
    pashto: 'د دې اپ ملاتړ کوونکي څوک دي؟',
    english: 'Who supports this app?',
    turkish: 'Bu uygulamayı kimler destekliyor?',
    arabic: 'من هم داعمو هذا البرنامج؟',
  },
  'chat.mufti.starter.creator': {
    dari: 'سازنده این برنامه کیست؟',
    pashto: 'دا اپ چا جوړ کړی؟',
    english: 'Who made this app?',
    turkish: 'Bu uygulamayı kim yaptı?',
    arabic: 'من صنع هذا البرنامج؟',
  },
  'chat.mufti.starter.travellerPrayer': {
    dari: 'نماز مسافر چند رکعت است؟',
    pashto: 'د مسافر لمونځ څو رکعته دی؟',
    english: 'How many rak‘ahs does a traveller pray?',
    turkish: 'Yolcu namazı kaç rekâttır?',
    arabic: 'كم ركعة صلاة المسافر؟',
  },

  // Bookmarks
  'bookmarks.title': { dari: 'نشانه‌ها', pashto: 'نښې', english: 'Bookmarks', turkish: 'Yer imleri', arabic: 'العلامات' },
  'bookmarks.savedCount': {
    dari: '{count} نشانه ذخیره شده',
    pashto: '{count} ساتل شوې نښې',
    english: '{count} saved bookmarks',
    turkish: '{count} kayıtlı yer imi',
    arabic: '{count} علامة محفوظة',
  },
  'bookmarks.noneSaved': {
    dari: 'هیچ نشانه‌ای ذخیره نشده',
    pashto: 'هېڅ نښه نه ده ساتل شوې',
    english: 'No bookmarks saved',
    turkish: 'Kayıtlı yer imi yok',
    arabic: 'لا توجد علامة محفوظة',
  },
  'bookmarks.emptyTitle': {
    dari: 'هیچ نشانه‌ای ندارید',
    pashto: 'تاسو هېڅ نښه نه لرئ',
    english: 'You have no bookmarks',
    turkish: 'Yer iminiz yok',
    arabic: 'ليست لديك أي علامة',
  },
  'bookmarks.emptyBody': {
    dari: 'آیات مورد علاقه خود را نشانه‌گذاری کنید تا بعداً به آنها دسترسی داشته باشید',
    pashto: 'خپل خوښ آیتونه ونښلوئ، څو وروسته ورته اسانه لاسرسی ولرئ',
    english: 'Bookmark the ayahs you love so you can find them again later',
    turkish: 'Sevdiğiniz ayetleri yer imlerine ekleyin, sonra yeniden bulabilesiniz',
    arabic: 'ضع علامة على الآيات التي تحبها حتى تصل إليها لاحقًا',
  },
  'bookmarks.delete.title': { dari: 'حذف نشانه', pashto: 'نښه ړنګول', english: 'Delete bookmark', turkish: 'Yer imini sil', arabic: 'حذف العلامة' },
  'bookmarks.delete.body': {
    dari: 'آیا می‌خواهید نشانه سوره {surah} آیه {ayah} را حذف کنید؟',
    pashto: 'غواړئ د {surah} سورت د {ayah} آیت نښه ړنګه کړئ؟',
    english: 'Delete the bookmark for Surah {surah}, ayah {ayah}?',
    turkish: 'Sure {surah}, ayet {ayah} yer imi silinsin mi?',
    arabic: 'هل تريد حذف علامة سورة {surah} آية {ayah}؟',
  },
  'bookmarks.page': { dari: 'صفحه {page}', pashto: '{page} مخ', english: 'Page {page}', turkish: 'Sayfa {page}', arabic: 'صفحة {page}' },

  // Quran search
  'search.mode.arabic': { dari: 'عربی', pashto: 'عربي', english: 'Arabic', turkish: 'Arapça', arabic: 'العربية' },
  'search.mode.all': { dari: 'همه', pashto: 'ټول', english: 'All', turkish: 'Tümü', arabic: 'الكل' },
  'search.placeholder.arabic': {
    dari: 'جستجو در متن عربی...',
    pashto: 'په عربي متن کې لټون...',
    english: 'Search the Arabic text…',
    turkish: 'Arapça metinde ara…',
    arabic: 'البحث في النص العربي...',
  },
  'search.placeholder.dari': {
    dari: 'جستجو در ترجمه دری...',
    pashto: 'د دري ژباړې لټون...',
    english: 'Search the Dari translation…',
    turkish: 'Darice çeviride ara…',
    arabic: 'البحث في الترجمة الدرية...',
  },
  'search.placeholder.pashto': {
    dari: 'جستجو در ترجمه پشتو...',
    pashto: 'د پښتو ژباړې لټون...',
    english: 'Search the Pashto translation…',
    turkish: 'Peştuca çeviride ara…',
    arabic: 'البحث في الترجمة البشتوية...',
  },
  'search.placeholder.turkish': {
    dari: 'جستجو در ترجمه ترکی...',
    pashto: 'د ترکي ژباړې لټون...',
    english: 'Search the Turkish translation…',
    turkish: 'Türkçe çeviride ara…',
    arabic: 'البحث في الترجمة التركية...',
  },
  'search.placeholder.all': {
    dari: 'جستجو در عربی و ترجمه‌ها...',
    pashto: 'په عربي او ژباړو کې لټون...',
    english: 'Search Arabic and the translations…',
    turkish: 'Arapça metinde ve çevirilerde ara…',
    arabic: 'البحث في العربية والترجمات...',
  },
  'search.failed': {
    dari: 'جستجو انجام نشد. دوباره تلاش کنید.',
    pashto: 'لټون ونه شو. بیا هڅه وکړئ.',
    english: 'The search could not be completed. Please try again.',
    turkish: 'Arama tamamlanamadı. Lütfen tekrar deneyin.',
    arabic: 'تعذر إجراء البحث. حاول مرة أخرى.',
  },
  'search.inProgress': { dari: 'در حال جستجو...', pashto: 'لټون روان دی...', english: 'Searching…', turkish: 'Aranıyor…', arabic: 'جارٍ البحث...' },
  'search.resultsCount': {
    dari: '{count} نتیجه یافت شد',
    pashto: '{count} پایلې وموندل شوې',
    english: '{count} results found',
    turkish: '{count} sonuç bulundu',
    arabic: 'عُثر على {count} نتيجة',
  },
  'search.noResults': {
    dari: 'نتیجه‌ای یافت نشد',
    pashto: 'هېڅ پایله ونه موندل شوه',
    english: 'No results found',
    turkish: 'Sonuç bulunamadı',
    arabic: 'لم يُعثر على نتيجة',
  },
  'search.tryAnother': {
    dari: 'عبارت دیگری را امتحان کنید',
    pashto: 'بله کلمه وازمویئ',
    english: 'Try a different phrase',
    turkish: 'Başka bir ifade deneyin',
    arabic: 'جرّب عبارة أخرى',
  },
  'search.prompt.title': {
    dari: 'جستجو در قرآن',
    pashto: 'په قرآن کې لټون',
    english: 'Search the Quran',
    turkish: 'Kur’an’da ara',
    arabic: 'البحث في القرآن',
  },
  'search.prompt.body': {
    dari: 'عربی، دری یا پښتو — حداقل ۲ حرف وارد کنید',
    pashto: 'عربي، دري یا پښتو — لږ تر لږه ۲ توري ولیکئ',
    english: 'Arabic, Dari or Pashto — enter at least 2 letters',
    turkish: 'Arapça, Darice veya Peştuca — en az 2 harf girin',
    arabic: 'العربية أو الدرية أو البشتو — أدخل حرفين على الأقل',
  },
  'search.surahNumber': { dari: 'سوره {number}', pashto: '{number} سورت', english: 'Surah {number}', turkish: 'Sure {number}', arabic: 'سورة {number}' },

  // Settings
  'settings.adhan.subtitle': {
    dari: 'صدای اذان و یادآوری برای هر نماز',
    pashto: 'د هر لمانځه د اذان غږ او یادونه',
    english: 'Adhan sound and reminder for each prayer',
    turkish: 'Her namaz için ezan sesi ve hatırlatma',
    arabic: 'صوت الأذان وتذكير لكل صلاة',
  },
  'settings.asrNotice': {
    dari: 'وقت عصر بر اساس مذهب حنفی محاسبه می‌شود (سایه دو برابر)',
    pashto: 'د مازدیګر وخت د حنفي مذهب له مخې محاسبه کېږي (دوه برابره سیوری)',
    english: 'Asr is calculated according to the Hanafi school (shadow length doubled)',
    turkish: 'İkindi, Hanefi mezhebine göre hesaplanır (gölge boyu iki kat)',
    arabic: 'يُحسب وقت العصر وفق المذهب الحنفي (ظل بمقدار الضعف)',
  },
  'settings.method.karachi': { dari: 'کراچی (حنفی)', pashto: 'کراچۍ (حنفي)', english: 'Karachi (Hanafi)', turkish: 'Karaçi (Hanefi)', arabic: 'كراتشي (حنفي)' },
  'settings.method.mwl': {
    dari: 'رابطه عالم اسلامی',
    pashto: 'د اسلامي نړۍ اتحادیه',
    english: 'Muslim World League',
    turkish: 'Müslüman Dünya Birliği',
    arabic: 'رابطة العالم الإسلامي',
  },
  'settings.method.isna': { dari: 'آمریکای شمالی', pashto: 'شمالي امریکا', english: 'North America (ISNA)', turkish: 'Kuzey Amerika (ISNA)', arabic: 'أمريكا الشمالية' },
  'settings.method.egypt': { dari: 'مصر', pashto: 'مصر', english: 'Egypt', turkish: 'Mısır', arabic: 'مصر' },
  'settings.method.makkah': { dari: 'ام‌القری مکه', pashto: 'ام القرى مکه', english: 'Umm al-Qura, Makkah', turkish: 'Ümmü’l-Kurâ, Mekke', arabic: 'أم القرى، مكة' },
  'settings.method.tehran': { dari: 'تهران', pashto: 'تهران', english: 'Tehran', turkish: 'Tahran', arabic: 'طهران' },

  // Home widgets
  'widget.adhanStatus.title': { dari: 'وضعیت اذان', pashto: 'د اذان حالت', english: 'Adhan status', turkish: 'Ezan durumu', arabic: 'حالة الأذان' },
  'widget.adhanStatus.permissionTitle': {
    dari: 'دسترسی اعلان‌ها',
    pashto: 'د خبرتیاوو اجازه',
    english: 'Notification access',
    turkish: 'Bildirim erişimi',
    arabic: 'الوصول إلى الإشعارات',
  },
  'widget.adhanStatus.permissionBody': {
    dari: 'برای فعال‌کردن اعلان‌های اذان، به Settings → Apps → Ibadet → Notifications بروید و Allow Notifications را روشن کنید.',
    pashto: 'د اذان د خبرتیاوو فعالولو لپاره Settings → Apps → Ibadet → Notifications ته لاړ شئ او Allow Notifications فعال کړئ.',
    english: 'To turn on Adhan notifications, go to Settings → Apps → Ibadet → Notifications and switch on Allow Notifications.',
    turkish: 'Ezan bildirimlerini açmak için Settings → Apps → Ibadet → Notifications yoluna gidin ve Allow Notifications anahtarını açın.',
    arabic: 'لتفعيل إشعارات الأذان، انتقل إلى Settings → Apps → Ibadet → Notifications وقم بتشغيل Allow Notifications.',
  },
  'widget.ok': { dari: 'باشه', pashto: 'سمه ده', english: 'OK', turkish: 'Tamam', arabic: 'حسنًا' },
} as const satisfies Record<string, UiMessage>;
