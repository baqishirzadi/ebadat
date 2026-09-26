import type { UiMessage } from '../messageType';

/** Copy owned by the ahadith screens. Keys are namespaced so this file can grow
 * without touching the shared catalog. */
export const ahadithMessages = {
  'ahadith.admin.pinRequired': { dari: 'رمز را وارد کنید.', pashto: 'پټنوم ولیکئ.', english: 'Enter the PIN.' },
  'ahadith.admin.pinInvalid': { dari: 'رمز نادرست است.', pashto: 'پټنوم ناسم دی.', english: 'The PIN is incorrect.' },
  'ahadith.admin.pinCheckFailed': { dari: 'بررسی رمز ممکن نشد. دوباره تلاش کنید.', pashto: 'پټنوم ونه کتل شو. بیا هڅه وکړئ.', english: 'The PIN could not be checked. Please try again.' },

  'ahadith.card.share': { dari: 'اشتراک‌گذاری حدیث', pashto: 'د حدیث شریکول', english: 'Share the hadith' },
  'ahadith.card.addBookmark': { dari: 'افزودن نشانه', pashto: 'نښه زیاتول', english: 'Add bookmark' },
  'ahadith.card.removeBookmark': { dari: 'حذف نشانه', pashto: 'نښه لرې کول', english: 'Remove bookmark' },
  'ahadith.card.bookmarkHint': { dari: 'برای نشانه‌گذاری حدیث، نگه دارید', pashto: 'د حدیث د نښه کولو لپاره یې ونیسئ', english: 'Press and hold to bookmark this hadith' },
  'ahadith.card.holdToBookmark': { dari: 'برای نشانه‌گذاری، نگه‌دارید', pashto: 'د نښه کولو لپاره یې ونیسئ', english: 'Press and hold to bookmark' },
  'ahadith.translation.unavailable': {
    dari: 'ترجمهٔ این زبان هنوز موجود نیست.',
    pashto: 'د دې ژبې ژباړه لا نشته.',
    english: 'A translation in this language is not available yet.',
  },

  'ahadith.search.placeholder': { dari: 'جستجو در عربی، دری، پشتو و انگلیسی', pashto: 'په عربي، دري، پښتو او انګلیسي کې لټون', english: 'Search in Arabic, Dari, Pashto or English' },
  'ahadith.search.label': { dari: 'جستجوی حدیث', pashto: 'د حدیث لټون', english: 'Search hadith' },
  'ahadith.search.clear': { dari: 'پاک‌کردن جستجو', pashto: 'لټون پاکول', english: 'Clear the search' },
  'ahadith.search.prompt': { dari: 'عبارت جستجو را وارد کنید', pashto: 'د لټون عبارت ولیکئ', english: 'Type a word to search' },

  'ahadith.muttafaq.empty': { dari: 'حدیث متفق‌علیه موجود نیست', pashto: 'متفق علیه حدیثونه نشته', english: 'No Muttafaq ‘alayh hadith is available' },

  'ahadith.topics.allChip': { dari: 'همه', pashto: 'ټول', english: 'All' },
  'ahadith.topics.all': { dari: 'موضوع: همه', pashto: 'ټولې موضوعګانې', english: 'All topics' },
  'ahadith.topics.selected': { dari: 'موضوع: {topic}', pashto: 'موضوع: {topic}', english: 'Topic: {topic}' },
  'ahadith.topics.empty': { dari: 'حدیثی برای نمایش موجود نیست', pashto: 'د ښودلو لپاره حدیث نشته', english: 'There is no hadith to show' },
  'ahadith.topics.emptyForTopic': { dari: 'در این موضوع حدیثی یافت نشد', pashto: 'په دې موضوع کې حدیث ونه موندل شو', english: 'No hadith was found for this topic' },

  'ahadith.notification.title': { dari: 'اعلان حدیث روز', pashto: 'د ورځې د حدیث خبرتیا', english: 'Hadith of the day notification' },
  'ahadith.notification.description': { dari: 'زمان دریافت حدیث روزانه را تنظیم کنید', pashto: 'د ورځني حدیث د ترلاسه کولو وخت وټاکئ', english: 'Choose when to receive the daily hadith' },
  'ahadith.notification.enabled': { dari: 'فعال', pashto: 'فعال', english: 'On' },
  'ahadith.notification.disabled': { dari: 'غیرفعال', pashto: 'غیرفعال', english: 'Off' },
  'ahadith.notification.save': { dari: 'ذخیره زمان اعلان', pashto: 'د خبرتیا وخت ساتل', english: 'Save the notification time' },
  'ahadith.notification.preview': {
    dari: 'زمان فعلی: {meridiem} • ساعت {hour} • دقیقه {minute}',
    pashto: 'اوسنی وخت: {meridiem} • ساعت {hour} • دقیقې {minute}',
    english: 'Current time: {hour}:{minute} {meridiem}',
  },
  'ahadith.notification.channelName': { dari: 'احادیث روزانه', pashto: 'ورځني حدیثونه', english: 'Daily hadith' },

  'ahadith.time.hour': { dari: 'ساعت', pashto: 'ساعت', english: 'Hour' },
  'ahadith.time.minute': { dari: 'دقیقه', pashto: 'دقیقې', english: 'Minute' },
  'ahadith.time.am': { dari: 'قبل‌ازظهر', pashto: 'له غرمې مخکې', english: 'AM' },
  'ahadith.time.pm': { dari: 'بعدازظهر', pashto: 'له غرمې وروسته', english: 'PM' },

  'ahadith.detail.title': { dari: 'حدیث', pashto: 'حدیث', english: 'Hadith' },
  'ahadith.detail.invalidId': { dari: 'شناسه حدیث معتبر نیست.', pashto: 'د حدیث پېژندشمېره ناسمه ده.', english: 'This hadith reference is not valid.' },
  'ahadith.detail.notFound': { dari: 'حدیث مورد نظر پیدا نشد.', pashto: 'غوښتل شوی حدیث ونه موندل شو.', english: 'The requested hadith could not be found.' },
  'ahadith.detail.loadFailed': { dari: 'دریافت حدیث ممکن نشد.', pashto: 'د حدیث ترلاسه کول ممکن نه شول.', english: 'The hadith could not be loaded.' },

  'ahadith.composer.title': { dari: 'حدیث جدید', pashto: 'نوی حدیث', english: 'New hadith' },
  'ahadith.composer.arabicText': { dari: 'متن عربی', pashto: 'عربي متن', english: 'Arabic text' },
  'ahadith.composer.dariTranslation': { dari: 'ترجمه دری', pashto: 'دري ژباړه', english: 'Dari translation' },
  'ahadith.composer.pashtoTranslation': { dari: 'ترجمه پشتو', pashto: 'پښتو ژباړه', english: 'Pashto translation' },
  'ahadith.composer.englishTranslation': { dari: 'ترجمه انگلیسی', pashto: 'انګلیسي ژباړه', english: 'English translation' },
  'ahadith.composer.sourceBook': { dari: 'کتاب منبع', pashto: 'د سرچینې کتاب', english: 'Source book' },
  'ahadith.composer.grade': { dari: 'درجه صحت', pashto: 'د صحت درجه', english: 'Authenticity grade' },
  'ahadith.composer.sourceNumber': { dari: 'شماره منبع', pashto: 'د سرچینې شمېره', english: 'Source number' },
  'ahadith.composer.dailyIndex': { dari: 'شماره روزانه (اختیاری)', pashto: 'ورځنۍ شمېره (اختیاري)', english: 'Daily index (optional)' },
  'ahadith.composer.topics': { dari: 'موضوعات (با ویرگول جدا کنید)', pashto: 'موضوعات (په کامه سره یې جلا کړئ)', english: 'Topics (separated by commas)' },
  'ahadith.composer.specialDays': { dari: 'رویدادهای مناسبتی (اختیاری)', pashto: 'ځانګړې ورځې (اختیاري)', english: 'Special occasions (optional)' },
  'ahadith.composer.hijriRange': { dari: 'بازه هجری (اختیاری)', pashto: 'د هجري نېټې موده (اختیاري)', english: 'Hijri range (optional)' },
  'ahadith.composer.month': { dari: 'ماه', pashto: 'میاشت', english: 'Month' },
  'ahadith.composer.dayFrom': { dari: 'از روز', pashto: 'له ورځې', english: 'From day' },
  'ahadith.composer.dayTo': { dari: 'تا روز', pashto: 'تر ورځې', english: 'To day' },
  'ahadith.composer.fridayOnly': { dari: 'فقط جمعه', pashto: 'یوازې جمعه', english: 'Friday only' },
  'ahadith.composer.publish': { dari: 'انتشار فوری حدیث', pashto: 'حدیث سمدستي خپرول', english: 'Publish the hadith now' },
  'ahadith.composer.missingTitle': { dari: 'نقص معلومات', pashto: 'ناقص معلومات', english: 'Missing information' },
  'ahadith.composer.missingRequired': {
    dari: 'متن عربی، ترجمه دری، پشتو، انگلیسی و شماره منبع الزامی است.',
    pashto: 'عربي متن، دري، پښتو او انګلیسي ژباړه او د سرچینې شمېره اړین دي.',
    english: 'Arabic text, Dari, Pashto and English translations, and the source number are required.',
  },
  'ahadith.composer.missingHijriRange': {
    dari: 'برای بازه هجری باید هر سه مقدار ماه، شروع و پایان روز را وارد کنید.',
    pashto: 'د هجري مودې لپاره باید درې واړه ارزښتونه — میاشت، د پیل ورځ او د پای ورځ — ولیکئ.',
    english: 'A Hijri range needs all three values: month, start day and end day.',
  },

  'ahadith.book.bukhari': { dari: 'بخاری', pashto: 'بخاري', english: 'Bukhari' },
  'ahadith.book.muslim': { dari: 'مسلم', pashto: 'مسلم', english: 'Muslim' },
  'ahadith.book.ahmad': { dari: 'احمد', pashto: 'احمد', english: 'Ahmad' },
  'ahadith.book.abuDawud': { dari: 'ابوداوود', pashto: 'ابوداوود', english: 'Abu Dawud' },
  'ahadith.book.tirmidhi': { dari: 'ترمذی', pashto: 'ترمذي', english: 'Tirmidhi' },
  'ahadith.book.nasai': { dari: 'نسائی', pashto: 'نسايي', english: 'Nasa’i' },
  'ahadith.book.ibnMajah': { dari: 'ابن ماجه', pashto: 'ابن ماجه', english: 'Ibn Majah' },

  'ahadith.specialDay.ramadan': { dari: 'رمضان', pashto: 'رمضان', english: 'Ramadan' },
  'ahadith.specialDay.laylatAlQadr': { dari: 'شب قدر (۲۷ رمضان)', pashto: 'د قدر شپه (۲۷ رمضان)', english: 'Laylat al-Qadr (27 Ramadan)' },
  'ahadith.specialDay.eidAlFitr': { dari: 'عید فطر', pashto: 'کوچنی اختر', english: 'Eid al-Fitr' },
  'ahadith.specialDay.eidAlAdha': { dari: 'عید قربان', pashto: 'لوی اختر', english: 'Eid al-Adha' },
  'ahadith.specialDay.arafah': { dari: 'روز عرفه', pashto: 'د عرفې ورځ', english: 'Day of Arafah' },
  'ahadith.specialDay.tashreeq': { dari: 'ایام تشریق', pashto: 'د تشریق ورځې', english: 'Days of Tashreeq' },
  'ahadith.specialDay.first10DhulHijjah': { dari: 'دهه اول ذوالحجه', pashto: 'د ذوالحجې لومړۍ لسیزه', english: 'First ten days of Dhul Hijjah' },
  'ahadith.specialDay.hijriNewYear': { dari: 'سال نو هجری', pashto: 'هجري نوی کال', english: 'Islamic New Year' },
  'ahadith.specialDay.ashura': { dari: 'عاشورا', pashto: 'عاشورا', english: 'Ashura' },
} as const satisfies Record<string, UiMessage>;
