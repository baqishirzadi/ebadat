import type { UiMessage } from '../messageType';

/** Copy owned by the prayer screens. Keys are namespaced so this file can grow
 * without touching the shared catalog. */
export const prayerMessages = {
  'prayer.unknownCity': { dari: 'شهر نامشخص', pashto: 'ناڅرګند ښار', english: 'Unknown city' },
  'prayer.changeCity': { dari: 'تغییر شهر', pashto: 'ښار بدلول', english: 'Change city' },
  'prayer.allCities': { dari: 'همه شهرها...', pashto: 'ټول ښارونه...', english: 'All cities…' },
  'prayer.hanafiNote': {
    dari: 'نماز عصر طبق مذهب حنفی محاسبه شده است',
    pashto: 'د مازدیګر لمونځ د حنفي مذهب له مخې حساب شوی دی.',
    english: 'Asr is calculated according to the Hanafi school.',
  },
  'prayer.fullName.fajr': { dari: 'نماز صبح', pashto: 'د سهار لمونځ', english: 'Fajr prayer' },
  'prayer.fullName.dhuhr': { dari: 'نماز ظهر', pashto: 'د غرمې لمونځ', english: 'Dhuhr prayer' },
  'prayer.fullName.asr': { dari: 'نماز عصر', pashto: 'د مازدیګر لمونځ', english: 'Asr prayer' },
  'prayer.fullName.maghrib': { dari: 'نماز شام', pashto: 'د ماښام لمونځ', english: 'Maghrib prayer' },
  'prayer.fullName.isha': { dari: 'نماز خفتن', pashto: 'د خفتن لمونځ', english: 'Isha prayer' },
  'prayer.city.searchPlaceholder': {
    dari: 'جستجوی شهر یا استان...',
    pashto: 'ښار یا ولایت ولټوئ...',
    english: 'Search for a city or province…',
  },
  'prayer.city.searchResults': { dari: 'نتایج جستجو', pashto: 'د لټون پایلې', english: 'Search results' },
  'prayer.city.noneFound': { dari: 'شهری یافت نشد', pashto: 'ښار ونه موندل شو', english: 'No city found' },
  'prayer.city.noneInCategory': {
    dari: 'شهری در این دسته وجود ندارد',
    pashto: 'په دې ډله کې ښار نشته',
    english: 'There are no cities in this group',
  },
  'prayer.city.gpsFoundTitle': { dari: 'موقعیت یافت شد', pashto: 'ځای وموندل شو', english: 'Location found' },
  'prayer.city.gpsNearest': {
    dari: 'شهر/استان نزدیک: {city}',
    pashto: 'نږدې ښار/ولایت: {city}',
    english: 'Nearest city or province: {city}',
  },
  'prayer.city.gpsConfirm': {
    dari: 'آیا می‌خواهید این مکان را انتخاب کنید؟',
    pashto: 'دا ځای ټاکل غواړئ؟',
    english: 'Do you want to use this location?',
  },
  'prayer.city.select': { dari: 'انتخاب', pashto: 'ټاکل', english: 'Select' },
  'prayer.city.gpsUnavailable': {
    dari: 'امکان تشخیص موقعیت وجود ندارد',
    pashto: 'ځای ونه موندل شو',
    english: 'Your location could not be detected',
  },
  'prayer.city.gpsError': {
    dari: 'خطا در تشخیص موقعیت',
    pashto: 'د ځای په موندلو کې تېروتنه وشوه.',
    english: 'Something went wrong while detecting your location',
  },
  'qibla.preparingCompass': {
    dari: 'در حال آماده‌سازی قطب‌نما...',
    pashto: 'قطب‌نما چمتو کېږي...',
    english: 'Preparing the compass…',
  },
  'tasbih.target': { dari: 'هدف', pashto: 'موخه', english: 'Target' },
  'tasbih.rounds': { dari: '{count} دور کامل', pashto: '{count} بشپړ دور', english: '{count} complete rounds' },
  'tasbih.tap': { dari: 'لمس کنید', pashto: 'دلته ټک وکړئ', english: 'Tap here' },
  'tasbih.reset': { dari: 'صفر کردن', pashto: 'شمېر صفر کول', english: 'Reset the count' },
  'onboarding.notifications.blockedTitle': {
    dari: 'اجازه اعلان غیرفعال است',
    pashto: 'د خبرتیا اجازه بنده ده',
    english: 'Notifications are blocked',
  },
  'onboarding.notifications.blockedBody': {
    dari: 'برای پخش به‌موقع اذان، اعلان‌های عبادت را از Settings دوباره فعال کنید.',
    pashto: 'د اذان د پر وخت غږولو لپاره، د عبادت خبرتیاوې بېرته د امستنو له لارې فعالې کړئ.',
    english: 'Turn worship notifications back on in Settings so Adhan can play on time.',
  },
  'onboarding.notifications.deniedTitle': {
    dari: 'اعلان‌ها فعال نشد',
    pashto: 'خبرتیاوې فعالې نه شوې',
    english: 'Notifications were not enabled',
  },
  'onboarding.notifications.deniedBody': {
    dari: 'بدون اجازه اعلان، اذان به‌موقع پخش نمی‌شود. می‌توانید دوباره تلاش کنید یا بدون اعلان ادامه دهید.',
    pashto: 'د خبرتیاوو له اجازې پرته اذان پر وخت نه غږېږي. بیا هڅه وکړئ یا له خبرتیا پرته دوام ورکړئ.',
    english: 'Without notification permission, Adhan will not play on time. You can try again or continue without notifications.',
  },

  'home.adhan.statusTitle': { dari: 'وضعیت اذان', pashto: 'د اذان حالت', english: 'Adhan status' },
  'home.adhan.summary.healthy': {
    dari: 'اذان آماده است و زمان‌بندی فعال است',
    pashto: 'اذان چمتو دی او مهالوېش فعال دی',
    english: 'The adhan is ready and scheduling is active',
  },
  'home.adhan.summary.warning': {
    dari: 'یک یا چند مورد نیاز به بررسی دارد',
    pashto: 'یو یا څو موارد کتنې ته اړتیا لري',
    english: 'One or more items need attention',
  },
  'home.adhan.summary.critical': {
    dari: 'برای پخش به‌موقع اذان، تنظیمات را اصلاح کنید',
    pashto: 'د اذان د پر وخت غږولو لپاره امستنې سمې کړئ',
    english: 'Fix your settings so the adhan plays on time',
  },
  'home.adhan.notificationsAccessTitle': {
    dari: 'دسترسی اعلان‌ها',
    pashto: 'د خبرتیاوو لاسرسی',
    english: 'Notification access',
  },
  'home.adhan.notificationsAccessBody': {
    dari: 'برای فعال‌کردن اعلان‌های اذان، به Settings → Apps → Ebadat → Notifications بروید و Allow Notifications را روشن کنید.',
    pashto: 'د اذان خبرتیاوو د فعالولو لپاره Settings → Apps → Ebadat → Notifications ته لاړ شئ او Allow Notifications روښانه کړئ.',
    english: 'To enable Adhan notifications, go to Settings → Apps → Ebadat → Notifications and turn on Allow Notifications.',
  },
  'common.ok': { dari: 'باشه', pashto: 'سمه ده', english: 'OK' },

  'adhanHealth.actions': { dari: 'اقدامات', pashto: 'کړنې', english: 'Actions' },
  'adhanHealth.refresh': { dari: 'بروزرسانی', pashto: 'تازه کول', english: 'Refresh' },
  'adhanHealth.repair': { dari: 'بازیابی اذان', pashto: 'اذان بیا رغول', english: 'Repair Adhan' },
  'adhanHealth.repairing': { dari: 'در حال بازیابی...', pashto: 'بیا رغول کېږي...', english: 'Repairing…' },
  'adhanHealth.liveTest': { dari: 'تست زنده (۲۵ ثانیه)', pashto: 'ژوندۍ ازموینه (۲۵ ثانیې)', english: 'Live test (25 seconds)' },
  'adhanHealth.testing': { dari: 'در حال تست...', pashto: 'ازموینه کېږي...', english: 'Testing…' },
  'adhanHealth.oemGuide': {
    dari: 'راهنمای گوشی (Autostart)',
    pashto: 'د موبایل لارښود (Autostart)',
    english: 'Phone guide (Autostart)',
  },
  'adhanHealth.testAdhan': {
    dari: 'تست اذان (۲۵ ثانیه)',
    pashto: 'د اذان ازموینه (۲۵ ثانیې)',
    english: 'Adhan test (25 seconds)',
  },
  'adhanHealth.notificationSettings': {
    dari: 'تنظیمات اعلان',
    pashto: 'د خبرتیاوو امستنې',
    english: 'Notification settings',
  },
  'adhanHealth.fallbackHint': {
    dari: 'حالت عادی فعال است؛ اذان ممکن است کمی تأخیر داشته باشد.',
    pashto: 'عادي حالت فعال دی؛ اذان ښايي لږ وځنډېږي.',
    english: 'Standard mode is on; the adhan may be slightly delayed.',
  },
  'adhanHealth.recheckSchedule': {
    dari: 'بررسی دوباره و زمان‌بندی',
    pashto: 'بیا کتل او مهالوېش',
    english: 'Recheck and schedule',
  },

  'adhanHealth.overall.healthy': {
    dari: 'اذان آماده است',
    pashto: 'اذان چمتو دی',
    english: 'Adhan is ready',
  },
  'adhanHealth.overall.warning': {
    dari: 'نیاز به بررسی',
    pashto: 'کتنې ته اړتیا ده',
    english: 'Needs a check',
  },
  'adhanHealth.overall.critical': {
    dari: 'مشکل جدی',
    pashto: 'جدي ستونزه',
    english: 'Serious problem',
  },
  'adhanHealth.nextAdhan': {
    dari: 'اذان بعدی: {time}',
    pashto: 'راتلونکی اذان: {time}',
    english: 'Next adhan: {time}',
  },
  'adhanHealth.scheduleHint': {
    dari: 'وضعیت زمان‌بندی را در زیر بررسی کنید.',
    pashto: 'د مهالوېش حالت لاندې وګورئ.',
    english: 'Check the schedule status below.',
  },
  'adhanHealth.recentEvents': {
    dari: 'آخرین رویدادها',
    pashto: 'وروستي پېښې',
    english: 'Recent events',
  },
  'adhanHealth.event.systemTest': {
    dari: 'تست سیستمی',
    pashto: 'سیسټمي ازموینه',
    english: 'System test',
  },
  'adhanHealth.event.maintenance': {
    dari: 'نگهداری',
    pashto: 'ساتنه',
    english: 'Maintenance',
  },
  'adhanHealth.event.adhan': {
    dari: 'اذان',
    pashto: 'اذان',
    english: 'Adhan',
  },
  'adhanHealth.error': {
    dari: 'خطا',
    pashto: 'تېروتنه',
    english: 'Error',
  },
  'adhanHealth.refreshFailed': {
    dari: 'بررسی سلامت اذان انجام نشد.',
    pashto: 'د اذان د حالت کتنه ترسره نه شوه.',
    english: 'Could not check Adhan health.',
  },
  'adhanHealth.repairDoneTitle': {
    dari: 'بازیابی انجام شد',
    pashto: 'بیا رغول بشپړ شو',
    english: 'Repair complete',
  },
  'adhanHealth.repairDoneBody': {
    dari: 'اذان‌ها دوباره با سیستم همگام شدند.',
    pashto: 'اذانونه له سیسټم سره بیا همغږي شول.',
    english: 'Adhan alarms were resynced with the system.',
  },
  'adhanHealth.repairFailed': {
    dari: 'بازیابی اذان انجام نشد.',
    pashto: 'د اذان بیا رغول ترسره نه شول.',
    english: 'Could not repair Adhan scheduling.',
  },
  'adhanHealth.testWaiting': {
    dari: 'در حال انتظار برای اعلان تست...',
    pashto: 'د ازموینې خبرتیا ته انتظار...',
    english: 'Waiting for the test notification…',
  },
  'adhanHealth.testPassed': {
    dari: 'تست موفق: اعلان با صدا دریافت شد.',
    pashto: 'ازموینه بریالۍ وه: خبرتیا له غږ سره ترلاسه شوه.',
    english: 'Test passed: notification received with sound.',
  },
  'adhanHealth.testFailed': {
    dari: 'تست ناموفق: اعلان در زمان مقرر دریافت نشد.',
    pashto: 'ازموینه ناکامه شوه: خبرتیا پر ټاکلي وخت ترلاسه نه شوه.',
    english: 'Test failed: notification was not received on time.',
  },
  'adhanHealth.testError': {
    dari: 'خطا در اجرای تست زنده.',
    pashto: 'د ژوندۍ ازموینې په اجرا کې تېروتنه.',
    english: 'Error running the live test.',
  },
  'adhanHealth.androidOnly': {
    dari: 'بررسی سلامت اذان فقط در اندروید در دسترس است.',
    pashto: 'د اذان د حالت کتنه یوازې په اندروید کې شته.',
    english: 'Adhan health checks are only available on Android.',
  },

  'prayer.notifications.moduleUnavailable': {
    dari: 'ماژول اعلان در دسترس نیست',
    pashto: 'د خبرتیا ماډول شتون نه لري',
    english: 'The notification module is unavailable',
  },
  'prayer.notifications.settingsOpenFailed': {
    dari: 'نمی‌توان تنظیمات را باز کرد. لطفاً دستی به تنظیمات دستگاه بروید.',
    pashto: 'امستنې نه شي پرانیستل کېدای. مهرباني وکړئ په لاسي ډول د موبایل امستنو ته لاړ شئ.',
    english: 'Could not open settings. Please open device settings manually.',
  },
} as const satisfies Record<string, UiMessage>;
