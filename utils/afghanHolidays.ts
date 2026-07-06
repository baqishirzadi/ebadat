/**
 * Afghan national and cultural holidays on the Shamsi (solar Hijri) calendar.
 */

export interface AfghanHoliday {
  shamsiMonth: number;
  shamsiDay: number;
  nameDari: string;
  namePashto: string;
  descriptionDari: string;
  isPublicHoliday?: boolean;
}

export const AFGHAN_HOLIDAYS: AfghanHoliday[] = [
  {
    shamsiMonth: 1,
    shamsiDay: 1,
    nameDari: 'نوروز',
    namePashto: 'نوروز',
    descriptionDari: 'آغاز سال نو شمسی',
    isPublicHoliday: true,
  },
  {
    shamsiMonth: 1,
    shamsiDay: 2,
    nameDari: 'روز بزرگداشت مولانا جلال‌الدین بلخی',
    namePashto: 'د مولانا جلال الدین بلخي لمانځه',
    descriptionDari: 'روز فرهنگی و ادبی',
  },
  {
    shamsiMonth: 2,
    shamsiDay: 27,
    nameDari: 'روز بزرگداشت خیام',
    namePashto: 'د خیام لمانځه',
    descriptionDari: 'روز فرهنگی',
  },
  {
    shamsiMonth: 5,
    shamsiDay: 28,
    nameDari: 'روز استقلال افغانستان',
    namePashto: 'د افغانستان د خپلواکۍ ورځ',
    descriptionDari: 'روز استقلال از بریتانیا (۱۹۱۹)',
    isPublicHoliday: true,
  },
  {
    shamsiMonth: 6,
    shamsiDay: 9,
    nameDari: 'روز شهیدان',
    namePashto: 'د شهیدانو ورځ',
    descriptionDari: 'یادبود شهیدان',
    isPublicHoliday: true,
  },
  {
    shamsiMonth: 7,
    shamsiDay: 26,
    nameDari: 'روز پیروزی مجاهدین',
    namePashto: 'د مجاهدینو د بریا ورځ',
    descriptionDari: 'روز ملی',
    isPublicHoliday: true,
  },
  {
    shamsiMonth: 8,
    shamsiDay: 8,
    nameDari: 'روز پیروزی هشت‌م حمل',
    namePashto: 'د اتم حمل د بریا ورځ',
    descriptionDari: 'سقوط رژیم کمونیستی (۱۳۷۱)',
    isPublicHoliday: true,
  },
  {
    shamsiMonth: 11,
    shamsiDay: 16,
    nameDari: 'روز بزرگداشت احمد شاه بابا',
    namePashto: 'د احمد شاه بابا لمانځه',
    descriptionDari: 'بنیان‌گذار دولت دورانی',
  },
  {
    shamsiMonth: 12,
    shamsiDay: 10,
    nameDari: 'روز بزرگداشت علی جلالی',
    namePashto: 'د علی جلالي لمانځه',
    descriptionDari: 'روز فرهنگی',
  },
];

export function getAfghanHolidaysForMonth(shamsiYear: number, shamsiMonth: number): AfghanHoliday[] {
  void shamsiYear;
  return AFGHAN_HOLIDAYS.filter((h) => h.shamsiMonth === shamsiMonth);
}
