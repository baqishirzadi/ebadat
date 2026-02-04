/**
 * Scholar Authentication Utilities
 * Handles scholar login, session management, and role verification using Supabase Auth
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { Scholar } from '@/types/articles';

const SCHOLAR_SESSION_KEY = '@ebadat/scholar_session';

export interface ScholarSession {
  uid: string;
  email: string;
  fullName: string;
  timestamp: number;
}

/**
 * Login scholar with email and password
 */
export async function loginScholar(email: string, password: string): Promise<ScholarSession> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const supabase = getSupabaseClient();
  
  // Sign in with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password,
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Authentication failed');
  }

  // Get scholar data from Supabase
  const { getScholarById } = await import('./scholarService');
  const scholar = await getScholarById(authData.user.id);

  if (!scholar) {
    // Sign out if scholar profile not found
    await supabase.auth.signOut();
    throw new Error('Scholar profile not found');
  }

  if (scholar.role !== 'scholar') {
    // Sign out if not a scholar account
    await supabase.auth.signOut();
    throw new Error('Access denied: Not a scholar account');
  }

  // Store session
  const session: ScholarSession = {
    uid: authData.user.id,
    email: authData.user.email || email,
    fullName: scholar.fullName,
    timestamp: Date.now(),
  };

  await AsyncStorage.setItem(SCHOLAR_SESSION_KEY, JSON.stringify(session));
  return session;
}

/**
 * Get current scholar session
 */
export async function getScholarSession(): Promise<ScholarSession | null> {
  try {
    // First check Supabase session
    if (!isSupabaseConfigured()) {
      return null;
    }

    const supabase = getSupabaseClient();
    const { data: { session: supabaseSession } } = await supabase.auth.getSession();

    if (!supabaseSession) {
      // Clear stored session if Supabase session is invalid
      await AsyncStorage.removeItem(SCHOLAR_SESSION_KEY);
      return null;
    }

    // Check stored session
    const sessionData = await AsyncStorage.getItem(SCHOLAR_SESSION_KEY);
    if (!sessionData) return null;

    const session: ScholarSession = JSON.parse(sessionData);
    
    // Verify session is not too old (7 days)
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - session.timestamp > sevenDays) {
      await AsyncStorage.removeItem(SCHOLAR_SESSION_KEY);
      await supabase.auth.signOut();
      return null;
    }

    // Verify session matches Supabase session
    if (session.uid !== supabaseSession.user.id) {
      await AsyncStorage.removeItem(SCHOLAR_SESSION_KEY);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error getting scholar session:', error);
    return null;
  }
}

/**
 * Logout scholar
 */
export async function logoutScholar(): Promise<void> {
  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    }
    await AsyncStorage.removeItem(SCHOLAR_SESSION_KEY);
  } catch (error) {
    console.error('Error logging out scholar:', error);
    throw error;
  }
}

/**
 * Check if user is authenticated as scholar
 */
export async function isScholarAuthenticated(): Promise<boolean> {
  const session = await getScholarSession();
  return session !== null;
}
