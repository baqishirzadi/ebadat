import type { UiMessage } from '../messageType';

export const madhhabMessages = {
  'onboarding.madhhab.title': {
    dari: 'مذهب فقهی خود را انتخاب کنید',
    pashto: 'خپل فقهي مذهب وټاکئ',
    english: 'Choose your school of fiqh',
    turkish: 'Fıkıh mezhebinizi seçin',
    arabic: 'اختر مذهبك الفقهي',
  },
  'onboarding.madhhab.subtitle': {
    dari: 'مفتی هوشمند مطابق همین مذهب جواب می‌دهد. بعداً از تنظیمات تغییر داده می‌توانید.',
    pashto: 'هوښیار مفتي د همدې مذهب له مخې ځواب وايي. وروسته یې له امستنو بدلولی شئ.',
    english: 'The Smart Mufti answers according to this school. You can change it later in Settings.',
    turkish: 'Akıllı müftü bu mezhebe göre cevap verir. Bunu daha sonra Ayarlar’dan değiştirebilirsiniz.',
    arabic: 'يجيب المفتي الذكي وفق هذا المذهب. ويمكنك تغييره لاحقاً من الإعدادات.',
  },
  'onboarding.madhhab.recommended': {
    dari: 'پیشنهادی برای افغانستان',
    pashto: 'د افغانستان لپاره وړاندیز',
    english: 'Recommended for Afghanistan',
    turkish: 'Afganistan için önerilir',
    arabic: 'موصى به لأفغانستان',
  },
  'settings.madhhab.title': {
    dari: 'مذهب فقهی',
    pashto: 'فقهي مذهب',
    english: 'School of fiqh',
    turkish: 'Fıkıh mezhebi',
    arabic: 'المذهب الفقهي',
  },
  'mufti.disclaimer.other': {
    dari: 'سوال فقهی خود را مطابق مذهب انتخاب‌شده بپرسید. احکام نهایی نیازمند مشورت با عالم مجرب است.',
    pashto: 'خپله فقهي پوښتنه د ټاکل شوي مذهب له مخې وکړئ. د وروستي حکم لپاره له باوري عالم سره مشوره وکړئ.',
    english: 'Ask according to your selected school. A final ruling still requires consulting a qualified scholar.',
    turkish: 'Sorunuzu seçtiğiniz mezhebe göre sorun. Kesin bir hüküm için yine de ehil bir âlime danışmak gerekir.',
    arabic: 'اسأل وفق المذهب الذي اخترته. والأحكام النهائية تحتاج إلى مشورة عالم متمكن.',
  },
  'mufti.subtitle.other': {
    dari: 'پاسخ مطابق مذهب انتخاب‌شده — راهنما',
    pashto: 'ځواب د ټاکل شوي مذهب له مخې — لارښوونه',
    english: 'Answers follow your selected school — guidance, not a fatwa',
    turkish: 'Cevaplar seçtiğiniz mezhebe göredir — rehberlik, fetva değil',
    arabic: 'الجواب وفق المذهب المختار — إرشاد لا فتوى',
  },
  'prayer.jumhurAsrNote': {
    dari: 'نماز عصر طبق جمهور محاسبه شده است: سایه برابر قد',
    pashto: 'د مازدیګر لمونځ د جمهور له مخې حساب شوی: سیوری د قد برابر',
    english: 'Asr follows the majority: the shadow equals the object’s height.',
    turkish: 'İkindi cumhura göredir: gölge, cismin boyuna eşittir.',
    arabic: 'حُسبت صلاة العصر وفق الجمهور: الظل يساوي طول الشخص',
  },
} as const satisfies Record<string, UiMessage>;
