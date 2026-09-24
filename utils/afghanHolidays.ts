/**
 * Light non-political Shamsi (solar Hijri) cultural markers for Jantari.
 * Religious occasions live on the Qamari calendar (SPECIAL_DAYS).
 */

export interface AfghanHoliday {
  shamsiMonth: number;
  shamsiDay: number;
  nameDari: string;
  namePashto: string;
  nameEnglish: string;
  descriptionDari: string;
  descriptionPashto: string;
  descriptionEnglish: string;
}

export const AFGHAN_HOLIDAYS: AfghanHoliday[] = [
  {
    shamsiMonth: 1,
    shamsiDay: 1,
    nameDari: 'نوروز',
    namePashto: 'نوروز',
    nameEnglish: 'Nawroz',
    descriptionDari: 'آغاز سال نو شمسی',
    descriptionPashto: 'د لمریز کال پیل',
    descriptionEnglish: 'Start of the solar year',
  },
  {
    shamsiMonth: 5,
    shamsiDay: 24,
    nameDari: 'روز فتح',
    namePashto: 'د فتحې ورځ',
    nameEnglish: 'Victory Day',
    descriptionDari: 'یاد روز فتح و پایان حضور نظامی خارجی',
    descriptionPashto: 'د فتحې او د بهرنیو ځواکونو د حضور د پای یاد',
    descriptionEnglish: 'Commemorating victory and the end of foreign military presence',
  },
  {
    shamsiMonth: 9,
    shamsiDay: 30,
    nameDari: 'شب چله (یلدا)',
    namePashto: 'د چلې شپه (یلدا)',
    nameEnglish: 'Shab-e Chella (Yalda)',
    descriptionDari: 'بلندترین شب زمستان',
    descriptionPashto: 'د ژمي تر ټولو اوږده شپه',
    descriptionEnglish: 'The longest night of winter',
  },
  {
    shamsiMonth: 10,
    shamsiDay: 1,
    nameDari: 'آغاز چله کلان',
    namePashto: 'د لویې چلې پیل',
    nameEnglish: 'Start of the Great Chella',
    descriptionDari: 'آغاز چهل روز سرد بزرگ زمستان',
    descriptionPashto: 'د ژمي د لویې څلوېښت ورځنۍ سړې دورې پیل',
    descriptionEnglish: 'Beginning of the forty coldest days of winter',
  },
  {
    shamsiMonth: 11,
    shamsiDay: 11,
    nameDari: 'آغاز چله خرد',
    namePashto: 'د وړې چلې پیل',
    nameEnglish: 'Start of the Small Chella',
    descriptionDari: 'آغاز بیست روز پایانی سرما پس از چله کلان',
    descriptionPashto: 'د لویې چلې وروسته د یخنۍ د وروستیو شلو ورځو پیل',
    descriptionEnglish: 'Beginning of the final twenty cold days after the Great Chella',
  },
  {
    shamsiMonth: 12,
    shamsiDay: 24,
    nameDari: 'یادبود ۲۴ حوت هرات',
    namePashto: 'د هرات د ۲۴ حوت یاد',
    nameEnglish: 'Herat 24 Hut Commemoration',
    descriptionDari: 'یاد فرهنگی مردم هرات',
    descriptionPashto: 'د هرات د خلکو کلتوري یاد',
    descriptionEnglish: 'A cultural commemoration for the people of Herat',
  },
];

export function getAfghanHolidaysForMonth(shamsiYear: number, shamsiMonth: number): AfghanHoliday[] {
  void shamsiYear;
  return AFGHAN_HOLIDAYS.filter((h) => h.shamsiMonth === shamsiMonth);
}
