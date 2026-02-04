/**
 * Firebase Configuration
 * Initialize Firebase for Expo (using Web SDK)
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Firebase configuration
// For production, these must be set via environment variables (EXPO_PUBLIC_*)
// Check FIREBASE_SETUP.md for configuration instructions
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  // Initialize only if not already initialized
  if (!app) {
    const existingApps = getApps();
    if (existingApps.length === 0) {
      // #region agent log
      const configStatus = getFirebaseConfigStatus();
      const initLog = {location:'firebase.ts:31',message:'Initializing Firebase App',data:{configured:configStatus.configured,missing:configStatus.missing,hasApiKey:!!firebaseConfig.apiKey,hasProjectId:!!firebaseConfig.projectId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
      console.log('[DEBUG]', JSON.stringify(initLog));
      fetch('http://127.0.0.1:7242/ingest/1c660e1a-f615-4adb-8f31-171e0c14ddc6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(initLog)}).catch(()=>{});
      // #endregion
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp(); // Use existing app instance
    }
  }
  return app;
}

export function getFirestoreDB(): Firestore {
  if (!db) {
    const firebaseApp = getFirebaseApp();
    db = getFirestore(firebaseApp);
  }
  return db;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const firebaseApp = getFirebaseApp();
    auth = getAuth(firebaseApp);
  }
  return auth;
}

// Check if Firebase is properly configured
export function isFirebaseConfigured(): boolean {
  const config = firebaseConfig;
  return (
    !!config.apiKey &&
    !!config.projectId &&
    !!config.appId &&
    config.apiKey.length > 0 &&
    config.projectId.length > 0 &&
    config.appId.length > 0
  );
}

// Get detailed configuration status for debugging
export function getFirebaseConfigStatus(): {
  configured: boolean;
  missing: string[];
  present: string[];
} {
  const config = firebaseConfig;
  const required = ['apiKey', 'projectId', 'appId', 'authDomain', 'storageBucket', 'messagingSenderId'];
  const missing: string[] = [];
  const present: string[] = [];

  required.forEach((key) => {
    const value = config[key as keyof typeof config];
    if (!value || value.length === 0) {
      missing.push(key);
    } else {
      present.push(key);
    }
  });

  return {
    configured: missing.length === 0,
    missing,
    present,
  };
}

// Log Firebase configuration status (for debugging)
export function logFirebaseConfigStatus(): void {
  const status = getFirebaseConfigStatus();
  if (status.configured) {
    console.log('[Firebase] ✅ Configuration is complete');
  } else {
    console.warn('[Firebase] ⚠️ Configuration is incomplete');
    console.warn(`[Firebase] Missing variables: ${status.missing.join(', ')}`);
    console.warn('[Firebase] Please create .env file with Firebase credentials');
    console.warn('[Firebase] See .env.example for template');
  }
}
