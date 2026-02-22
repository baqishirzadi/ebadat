/**
 * Dua Advisor Response Builder
 * Generates spiritually uplifting responses in Dari/Pashto.
 */

import { DuaCategory, UserGender } from '@/types/dua';

export type DuaLanguage = 'dari' | 'pashto';

const PASHTO_LETTERS = /[ګځڅښڼۍۀډټړ]/;
const PASHTO_WORDS = /\b(زه|ته|ستا|ستاسو|زما|موږ|زمونږ|کوم|کړم|شوم|يم)\b/;

const SENSITIVE_KEYWORDS = /طلاق|نکاح|عقد|مهریه|مهريه|ارث|میراث|قرض|ربا|سود|جنایت|قتل|خودکشی|سقط|بیماری|جراحی|قرارداد|وراثت|دیۀ|دیه|خیانت|طلاقه|نفقه/;
const SENSITIVE_KEYWORDS_PS = /طلاق|نکاح|مهر|ارث|قرض|ربا|قتل|خودکشي|سقط|ناروغي|جراحي|قرارداد|وراثت|نفقة|نفکه/;

const ACK_DARI = [
  'دل‌نوشته‌تان را با احترام خواندم؛ خداوند بر شما گشایش و آرامش دهد.',
  'از درد دل‌تان آگاه شدم؛ خداوند دل‌تان را آرام سازد.',
  'پیام شما به دل رسید؛ خداوند از شما دستگیری کند و راه روشن نشان دهد.',
];

const ACK_PASHTO = [
  'ستا خبرې مې په درناوي ولوستلې؛ الله دې پر تا سکون او آسانتیا راولي.',
  'ستاسو درد مې واورېد؛ الله دې زړه مو آرام کړي.',
  'ستا پیغام راته ورسید؛ الله دې له تا سره مرسته او لارښوونه وکړي.',
];

const DUA_DARI = [
  'اللهم إني أسألك العفو والعافية، وراحة القلب وطمأنينة الروح. پروردگارا، ما را به رحمت و خیر خود برسان.',
  'یا الله، دل ما را با نور خود روشن کن و غم‌ها را به آرامش بدل گردان.',
  'بارالها، به درگاهت امید داریم؛ ما را در پناه لطف و هدایت خویش نگه‌دار.',
];

const DUA_PASHTO = [
  'اللهم إني أسألك العفو والعافية، وراحة القلب وطمأنينة الروح. يا الله، زموږ زړونه په خیر او رحمت سره ډک کړه.',
  'يا الله، زموږ زړونه روښانه کړه او اندېښنې په سکون واړوه.',
  'بارالها، ستا په رحمت امید لرو؛ موږ د خپل لطف په سیوري کې وساته.',
];

const VERSE_DARI = [
  '«اَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ» — آگاه باشید که با یاد خدا دل‌ها آرام می‌گیرد.',
  '«وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ» — هر که بر خدا توکل کند، خدا برای او بس است.',
];

const VERSE_PASHTO = [
  '«اَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ» — پوه شئ چې د الله په یاد زړونه آرامېږي.',
  '«وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ» — څوک چې پر الله توکل وکړي، الله ورته بس دی.',
];

const ADVICE_DARI: Record<DuaCategory, string[]> = {
  dua: [
    'بر استغفار و صلوات دوام دهید؛ این‌ها درهای رحمت را می‌گشاید.',
  ],
  advice: [
    'با نیت پاک، مسئله را ساده و روشن بنویسید تا راهنمایی دقیق‌تر شود.',
  ],
  personal: [
    'در سختی‌ها، نماز و ذکر را رها نکنید؛ آرامش حقیقی از آن‌جاست.',
  ],
  other: [
    'راه گشایش با صبر، توکل و امید نرم می‌شود.',
  ],
};

const ADVICE_PASHTO: Record<DuaCategory, string[]> = {
  dua: [
    'استغفار او صلوات ته دوام ورکړئ؛ دا د رحمت دروازې پرانيزي.',
  ],
  advice: [
    'مسأله مو په ساده او روښانه ډول ولیکئ څو لارښوونه اسانه شي.',
  ],
  personal: [
    'په ستونزو کې لمونځ او ذکر مه پرېږدئ؛ سکون له همدغه ځایه راځي.',
  ],
  other: [
    'صبر، توکل او امید د لارې ګره پرانیزي.',
  ],
};

const DHIKR_DARI = [
  'ذکرِ خفی: در سکوت دل، «الله الله» را آهسته و پیوسته بگویید (۳۳ یا ۱۰۰ بار).',
];

const DHIKR_PASHTO = [
  'خفي ذکر: په زړه کې په ارامۍ «الله الله» تکرار کړئ (۳۳ یا ۱۰۰ ځلې).',
];

const CLOSING_DARI = [
  'خداوند بر شما خیر، نور و گشایش عطا فرماید.',
];

const CLOSING_PASHTO = [
  'الله دې پر تاسو خیر، نور او آسانتیا نازل کړي.',
];

function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

export function detectLanguage(message: string): DuaLanguage {
  const text = message || '';
  if (PASHTO_LETTERS.test(text) || PASHTO_WORDS.test(text)) {
    return 'pashto';
  }
  return 'dari';
}

function needsScholarConsultation(message: string): boolean {
  return SENSITIVE_KEYWORDS.test(message) || SENSITIVE_KEYWORDS_PS.test(message);
}

export function formatSignature(gender: UserGender, language: DuaLanguage): string {
  if (language === 'pashto') {
    return gender === 'female'
      ? 'خور عزیز، دعاګو یم — سیدعبدالباقی شیرزادی'
      : 'ورور عزیز، دعاګو یم — سیدعبدالباقی شیرزادی';
  }
  return gender === 'female'
    ? 'خواهر عزیز، دعاگوی تو هستم — سیدعبدالباقی شیرزادی'
    : 'برادر عزیز، دعاگوی تو هستم — سیدعبدالباقی شیرزادی';
}

function getAddressLine(gender: UserGender, language: DuaLanguage): string {
  if (language === 'pashto') {
    return gender === 'female' ? 'خور عزیز' : 'ورور عزیز';
  }
  return gender === 'female' ? 'خواهر عزیز' : 'برادر عزیز';
}

export function ensureSignature(text: string, gender: UserGender, language?: DuaLanguage): string {
  const safeText = text.trim();
  if (!safeText) return safeText;
  if (safeText.includes('سیدعبدالباقی شیرزادی')) {
    return safeText;
  }
  const lang = language || 'dari';
  return `${safeText}\n\n${formatSignature(gender, lang)}`;
}

export function buildDuaResponse(params: {
  message: string;
  category: DuaCategory;
  gender?: UserGender;
  language?: DuaLanguage;
}): string {
  const { message, category } = params;
  const language = params.language || detectLanguage(message);
  const gender = params.gender || 'male';
  const seed = (message || '').length + category.length;

  const addressLine = getAddressLine(gender, language);
  const ack = language === 'pashto' ? pick(ACK_PASHTO, seed) : pick(ACK_DARI, seed);
  const dua = language === 'pashto' ? pick(DUA_PASHTO, seed + 1) : pick(DUA_DARI, seed + 1);
  const verse = language === 'pashto' ? pick(VERSE_PASHTO, seed + 2) : pick(VERSE_DARI, seed + 2);
  const adviceList = language === 'pashto' ? ADVICE_PASHTO[category] : ADVICE_DARI[category];
  const advice = pick(adviceList, seed + 3);
  const dhikr = language === 'pashto' ? pick(DHIKR_PASHTO, seed + 4) : pick(DHIKR_DARI, seed + 4);
  const closing = language === 'pashto' ? pick(CLOSING_PASHTO, seed + 5) : pick(CLOSING_DARI, seed + 5);
  const consult =
    needsScholarConsultation(message)
      ? language === 'pashto'
        ? 'که مسأله حساس فقهي وي، له نږدې حنفي عالم سره هم مشوره وکړئ.'
        : 'اگر مسئله حساس فقهی باشد، با عالم حنفی محل نیز مشوره کنید.'
      : '';

  const signature = formatSignature(gender, language);

  return [addressLine, ack, dua, verse, advice, consult, dhikr, closing, signature]
    .filter(Boolean)
    .join('\n\n');
}
