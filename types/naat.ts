export type NaatLanguage = 'fa' | 'ps' | 'ar';

// Supabase catalog record
export type Naat = {
  id: string;
  title_fa: string;
  title_ps: string;
  reciter_name: string;
  description?: string | null;
  audio_url: string;
  duration_seconds?: number | null;
  file_size_mb?: number | null;
  created_at: string;

  // Local/offline metadata
  localFileUri?: string;
  isDownloaded: boolean;
  downloadProgress?: number;
  lastPositionMillis?: number;
};

export type NaatDraft = {
  title_fa: string;
  title_ps: string;
  reciter_name: string;
  description?: string;
  audio_url: string;
  duration_seconds?: number | null;
  file_size_mb?: number | null;
};
