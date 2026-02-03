/**
 * Scholar Authentication Utilities
 * Handles scholar login, session management, and role verification
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseAuth, isFirebaseConfigured } from './firebase';
import { signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
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
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured');
  }

  const auth = getFirebaseAuth();
  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);

  // Get scholar data from Firestore
  const { getScholarById } = await import('./scholarService');
  const scholar = await getScholarById(userCredential.user.uid);

  if (!scholar) {
    throw new Error('Scholar profile not found');
  }

  if (scholar.role !== 'scholar') {
    throw new Error('Access denied: Not a scholar account');
  }

  // Store session
  const session: ScholarSession = {
    uid: userCredential.user.uid,
    email: userCredential.user.email || email,
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
    const sessionData = await AsyncStorage.getItem(SCHOLAR_SESSION_KEY);
    if (!sessionData) return null;

    const session: ScholarSession = JSON.parse(sessionData);
    
    // Verify session is not too old (7 days)
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - session.timestamp > sevenDays) {
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
    const auth = getFirebaseAuth();
    await signOut(auth);
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
