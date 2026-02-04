/**
 * Supabase Configuration
 * Initialize Supabase for Expo
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
// For production, these must be set via environment variables (EXPO_PUBLIC_*)
const supabaseConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
};

let supabaseClient: SupabaseClient | null = null;

/**
 * Get Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!supabaseConfig.url || !supabaseConfig.anonKey) {
      throw new Error('Supabase is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.');
    }
    supabaseClient = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseClient;
}

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    supabaseConfig.url &&
    supabaseConfig.anonKey &&
    supabaseConfig.url.length > 0 &&
    supabaseConfig.anonKey.length > 0 &&
    !supabaseConfig.url.includes('your-') &&
    !supabaseConfig.anonKey.includes('your-')
  );
}

/**
 * Get detailed configuration status for debugging
 */
export function getSupabaseConfigStatus(): {
  configured: boolean;
  missing: string[];
  present: string[];
} {
  const missing: string[] = [];
  const present: string[] = [];

  if (!supabaseConfig.url || supabaseConfig.url.length === 0 || supabaseConfig.url.includes('your-')) {
    missing.push('EXPO_PUBLIC_SUPABASE_URL');
  } else {
    present.push('EXPO_PUBLIC_SUPABASE_URL');
  }

  if (!supabaseConfig.anonKey || supabaseConfig.anonKey.length === 0 || supabaseConfig.anonKey.includes('your-')) {
    missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  } else {
    present.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  return {
    configured: missing.length === 0,
    missing,
    present,
  };
}

/**
 * Log Supabase configuration status (for debugging)
 */
export function logSupabaseConfigStatus(): void {
  const status = getSupabaseConfigStatus();
  if (status.configured) {
    console.log('[Supabase] ✅ Configuration is complete');
  } else {
    console.warn('[Supabase] ⚠️ Configuration is incomplete');
    console.warn(`[Supabase] Missing variables: ${status.missing.join(', ')}`);
    console.warn('[Supabase] Please create .env file with Supabase credentials');
    console.warn('[Supabase] See .env.example for template');
  }
}
