export type NaatLanguage = 'fa' | 'ps' | 'ar';

export type Naat = {
  id: string;
  title: string;
  reciterName: string;
  language: NaatLanguage;
  youtubeUrl: string;
  extractedAudioUrl?: string;
  duration?: number;
  localFileUri?: string;
  isDownloaded: boolean;
  playCount: number;
  createdAt: Date;
};

export type NaatDraft = {
  title: string;
  reciterName: string;
  language: NaatLanguage;
  youtubeUrl: string;
  extractedAudioUrl?: string;
};
