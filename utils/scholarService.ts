/**
 * Scholar Service
 * CRUD operations for scholars using Supabase
 * Falls back to local JSON file if Supabase is not available
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { Scholar } from '@/types/articles';
import articlesSeedData from '@/data/articles-seed.json';

const ENABLE_SCHOLARS_REMOTE = false;

export function isScholarsRemoteEnabled(): boolean {
  return ENABLE_SCHOLARS_REMOTE && isSupabaseConfigured();
}

/**
 * Helper function to convert Supabase row to Scholar
 */
function rowToScholar(row: any): Scholar {
  return {
    id: row.id,
    email: row.email || '',
    fullName: row.full_name || '',
    bio: row.bio || '',
    photoUrl: row.photo_url,
    verified: row.verified || false,
    role: 'scholar',
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  };
}

/**
 * Get scholar by ID
 */
export async function getScholarById(scholarId: string): Promise<Scholar | null> {
  // Try Supabase first
  if (isScholarsRemoteEnabled()) {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('scholars')
        .select('*')
        .eq('id', scholarId)
        .single();

      if (!error && data) {
        return rowToScholar(data);
      }
    } catch (error) {
      // Fall through to local data
    }
  }

  // Fallback to local JSON file
  const scholars = loadScholarsFromLocal();
  return scholars.find(s => s.id === scholarId) || null;
}

/**
 * Load scholars from local JSON file
 */
function loadScholarsFromLocal(): Scholar[] {
  try {
    const now = new Date();
    const scholars: Scholar[] = articlesSeedData.scholars
      .filter(s => s.verified)
      .map((scholarData) => ({
        id: scholarData.id,
        email: scholarData.email,
        fullName: scholarData.fullName,
        bio: scholarData.bio,
        photoUrl: undefined,
        verified: scholarData.verified,
        role: 'scholar' as const,
        createdAt: now,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    console.log(`[Scholars] Loaded ${scholars.length} scholars from local JSON file`);
    return scholars;
  } catch (error) {
    console.error('Error loading scholars from local file:', error);
    return [];
  }
}

/**
 * Get all verified scholars
 */
export async function getAllScholars(): Promise<Scholar[]> {
  // Try Supabase first
  if (isScholarsRemoteEnabled()) {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('scholars')
        .select('*')
        .eq('verified', true)
        .order('full_name', { ascending: true });

      if (error) {
        console.warn('[Scholars] Supabase error, falling back to local data:', error.message);
        // Fall through to local data
      } else if (data && data.length > 0) {
        return data.map(rowToScholar);
      }
    } catch (error) {
      console.warn('[Scholars] Supabase failed, falling back to local data:', error);
      // Fall through to local data
    }
  }

  // Fallback to local JSON file
  return loadScholarsFromLocal();
}

/**
 * Create or update scholar profile
 */
export async function upsertScholar(scholar: Omit<Scholar, 'createdAt'>): Promise<void> {
  if (!isScholarsRemoteEnabled()) {
    throw new Error('Scholars remote source disabled');
  }

  try {
    const supabase = getSupabaseClient();
    
    const scholarData = {
      id: scholar.id,
      email: scholar.email,
      full_name: scholar.fullName,
      bio: scholar.bio,
      photo_url: scholar.photoUrl || null,
      verified: scholar.verified,
      role: 'scholar',
    };

    // Use upsert (insert or update)
    const { error } = await supabase
      .from('scholars')
      .upsert(scholarData, { onConflict: 'id' });

    if (error) {
      console.error('Error upserting scholar:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error upserting scholar:', error);
    throw error;
  }
}

/**
 * Fixed list of 7 trusted scholars
 */
export const TRUSTED_SCHOLARS = [
  {
    fullName: 'Mufti Fayz Muhammad Usmani',
    bio: 'مفتی فایض محمد عثمانی - عالم دین و فقیه',
  },
  {
    fullName: 'Mufti Abdul Salam Abid',
    bio: 'مفتی عبدالسلام عابد - عالم دین و مشاور شرعی',
  },
  {
    fullName: 'Mufti Fazlullah Noori',
    bio: 'مفتی فضل الله نوری - عالم دین و فقیه',
  },
  {
    fullName: 'Mawlana Sayyid Muhammad Shirzadi',
    bio: 'مولانا سید محمد شیرزادی - عالم دین و خطیب',
  },
  {
    fullName: 'Mawlana Fazlur Rahman Ansari',
    bio: 'مولانا فضل الرحمن انصاری - عالم دین و استاد',
  },
  {
    fullName: 'Sayyid Abdul Ilah Shirzadi',
    bio: 'سید عبدالاله شیرزادی - عالم دین و مشاور',
  },
  {
    fullName: 'Sayyid Abdullah Shirzadi',
    bio: 'سید عبدالله شیرزادی - عالم دین و خطیب',
  },
] as const;
