/**
 * Centralized Ramadan screen and feature tile content
 * Dari + Pashto copy for a more practical daily Ramadan plan
 */

import { MaterialIcons } from '@expo/vector-icons';

export const RAMADAN_FEATURE_COPY = {
  title: 'برنامه رمضان',
  subtitle: 'برنامه روزانه ختم قرآن، دعا و تهذیب نفس',
};

type IconName = keyof typeof MaterialIcons.glyphMap;

export interface RamadanDualTextItem {
  id: string;
  icon: IconName;
  dariTitle: string;
  dariText: string;
  pashtoTitle: string;
  pashtoText: string;
}

export const RAMADAN_DAILY_MAP: RamadanDualTextItem[] = [
  {
    id: 'suhoor',
    icon: 'dark-mode',
    dariTitle: 'سحر و نیت',
    dariText: 'با نیت خالص، سحری متعادل و آب کافی روز را آغاز کنید.',
    pashtoTitle: 'پشمنی او نيت',
    pashtoText: 'ورځ د خالص نيت، متوازن پشمني او کافي اوبو سره پیل کړئ.',
  },
  {
    id: 'quran',
    icon: 'menu-book',
    dariTitle: 'تلاوت و تدبر',
    dariText: 'برای هر روز یک جزء زمان ثابت بگذارید؛ کم ولی پیوسته بخوانید.',
    pashtoTitle: 'تلاوت او تدبر',
    pashtoText: 'د هرې ورځې لپاره د يو جزء ثابت وخت وټاکئ؛ لږ خو پرله‌پسې ولولئ.',
  },
  {
    id: 'dhikr',
    icon: 'auto-awesome',
    dariTitle: 'ذکر و استغفار',
    dariText: 'بین کارهای روزانه ذکر کوتاه و استغفار را با زبان و دل همراه کنید.',
    pashtoTitle: 'ذکر او استغفار',
    pashtoText: 'د ورځنیو کارونو ترمنځ لنډ ذکر او استغفار د ژبې او زړه سره وکړئ.',
  },
  {
    id: 'iftar',
    icon: 'nights-stay',
    dariTitle: 'افطار با میانه‌روی',
    dariText: 'افطار را سبک آغاز کنید، آب کافی بنوشید و برای نماز آماده بمانید.',
    pashtoTitle: 'افطار په اعتدال',
    pashtoText: 'افطار په سپک خوراک پيل کړئ، کافي اوبه وڅښئ او د لمانځه لپاره تیار اوسئ.',
  },
];

export const RAMADAN_SUHOOR_IFTAAR_TIPS: RamadanDualTextItem[] = [
  {
    id: 'tip1',
    icon: 'water-drop',
    dariTitle: 'آب کافی',
    dariText: 'بین افطار تا سحر آب را تدریجی بنوشید؛ یک‌باره نوشیدن کافی نیست.',
    pashtoTitle: 'کافي اوبه',
    pashtoText: 'له افطار تر سحره اوبه په تدریج وڅښئ؛ یو ځل ډېرې اوبه بسنه نه کوي.',
  },
  {
    id: 'tip2',
    icon: 'restaurant',
    dariTitle: 'غذای متعادل',
    dariText: 'سحری با پروتئین و فیبر (مثل تخم‌مرغ، لبنیات، نان سبوس‌دار) سیری پایدار می‌دهد.',
    pashtoTitle: 'متوازن خواړه',
    pashtoText: 'پشمني کې پروټین او فایبر (لکه هګۍ، لبنيات او سبوس لرونکې ډوډۍ) اوږدمهاله مړښت ورکوي.',
  },
  {
    id: 'tip3',
    icon: 'self-improvement',
    dariTitle: 'آرامش قبل از خواب',
    dariText: 'شب‌ها با کاهش صفحه موبایل و ذکر کوتاه، خواب منظم‌تر و سحر آسان‌تر می‌شود.',
    pashtoTitle: 'له خوب مخکې ارام',
    pashtoText: 'د شپې د موبایل د استعمال په کمولو او لنډ ذکر سره خوب منظمېږي او پشمنی اسانه کېږي.',
  },
];

export const RAMADAN_SMALL_GOALS: RamadanDualTextItem[] = [
  {
    id: 'goal1',
    icon: 'check-circle-outline',
    dariTitle: 'هدف قرآن',
    dariText: 'هر روز حداقل ۲۰ صفحه یا یک جزء با ترجمه بخوانم.',
    pashtoTitle: 'د قرآن هدف',
    pashtoText: 'هره ورځ لږ تر لږه ۲۰ مخه يا يو جزء له ژباړې سره ولولم.',
  },
  {
    id: 'goal2',
    icon: 'check-circle-outline',
    dariTitle: 'هدف اخلاق',
    dariText: 'امروز از تندی زبان خودداری کنم و یک کار خیر پنهان انجام دهم.',
    pashtoTitle: 'د اخلاقو هدف',
    pashtoText: 'نن به له تندې ژبې ځان ساتم او يو پټ خیر کار به کوم.',
  },
  {
    id: 'goal3',
    icon: 'check-circle-outline',
    dariTitle: 'هدف دعا',
    dariText: 'در وقت افطار برای خانواده، امت و مردم افغانستان دعا کنم.',
    pashtoTitle: 'د دعا هدف',
    pashtoText: 'د افطار پر وخت د کورنۍ، امت او د افغانستان خلکو لپاره دعا وکړم.',
  },
];
