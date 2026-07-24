/**
 * Light non-political Shamsi (solar Hijri) cultural markers for Jantari.
 * Religious occasions live on the Qamari calendar (SPECIAL_DAYS).
 */

export interface AfghanHoliday {
  shamsiMonth: number;
  shamsiDay: number;
  nameDari: string;
  namePashto: string;
  descriptionDari: string;
}

export const AFGHAN_HOLIDAYS: AfghanHoliday[] = [
  {
    shamsiMonth: 1,
    shamsiDay: 1,
    nameDari: 'نوروز',
    namePashto: 'نوروز',
    descriptionDari: 'آغاز سال نو شمسی',
  },
  {
    shamsiMonth: 5,
    shamsiDay: 24,
    nameDari: 'روز فتح',
    namePashto: 'د فتحې ورځ',
    descriptionDari: 'یاد روز فتح و پایان حضور نظامی خارجی',
  },
  {
    shamsiMonth: 9,
    shamsiDay: 30,
    nameDari: 'شب چله (یلدا)',
    namePashto: 'د چلې شپه (یلدا)',
    descriptionDari: 'بلندترین شب زمستان',
  },
  {
    shamsiMonth: 10,
    shamsiDay: 1,
    nameDari: 'آغاز چله کلان',
    namePashto: 'د لویې چلې پیل',
    descriptionDari: 'آغاز چهل روز سرد بزرگ زمستان',
  },
  {
    shamsiMonth: 11,
    shamsiDay: 11,
    nameDari: 'آغاز چله خرد',
    namePashto: 'د وړې چلې پیل',
    descriptionDari: 'آغاز بیست روز پایانی سرما پس از چله کلان',
  },
  {
    shamsiMonth: 12,
    shamsiDay: 24,
    nameDari: 'یادبود ۲۴ حوت هرات',
    namePashto: 'د هرات د ۲۴ حوت یاد',
    descriptionDari: 'یاد فرهنگی مردم هرات',
  },
];

export function getAfghanHolidaysForMonth(shamsiYear: number, shamsiMonth: number): AfghanHoliday[] {
  void shamsiYear;
  return AFGHAN_HOLIDAYS.filter((h) => h.shamsiMonth === shamsiMonth);
}
