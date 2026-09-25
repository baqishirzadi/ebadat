export type ResponderId =
  | 'syed_abdul_baqi_shirzadi'
  | 'qari_syed_safiullah_shirzadi';

export interface Responder {
  id: ResponderId;
  nameDari: string;
  namePashto: string;
  nameEnglish: string;
}

export const RESPONDERS: readonly Responder[] = [
  {
    id: 'qari_syed_safiullah_shirzadi',
    nameDari: 'قاری سید صفی‌الله شیرزادی',
    namePashto: 'قاری سید صفی‌الله شیرزادی',
    nameEnglish: 'Qari Syed Safiullah Shirzadi',
  },
  {
    id: 'syed_abdul_baqi_shirzadi',
    nameDari: 'سیدعبدالباقی شیرزادی',
    namePashto: 'سیدعبدالباقی شیرزادی',
    nameEnglish: 'Syed Abdul Baqi Shirzadi',
  },
];

export function getResponder(id: string | null | undefined): Responder | null {
  return RESPONDERS.find((responder) => responder.id === id) ?? null;
}
