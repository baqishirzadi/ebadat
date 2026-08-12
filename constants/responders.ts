export type ResponderId =
  | 'syed_abdul_baqi_shirzadi'
  | 'qari_syed_safiullah_shirzadi';

export interface Responder {
  id: ResponderId;
  nameDari: string;
  namePashto: string;
}

export const RESPONDERS: readonly Responder[] = [
  {
    id: 'qari_syed_safiullah_shirzadi',
    nameDari: 'قاری سید صفی‌الله شیرزادی',
    namePashto: 'قاری سید صفی‌الله شیرزادی',
  },
  {
    id: 'syed_abdul_baqi_shirzadi',
    nameDari: 'سیدعبدالباقی شیرزادی',
    namePashto: 'سیدعبدالباقی شیرزادی',
  },
];

export function getResponder(id: string | null | undefined): Responder | null {
  return RESPONDERS.find((responder) => responder.id === id) ?? null;
}
