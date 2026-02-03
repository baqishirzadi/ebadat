/**
 * Scholar Service
 * CRUD operations for scholars
 */

import { getFirestoreDB, isFirebaseConfigured } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Scholar } from '@/types/articles';

/**
 * Get scholar by ID
 */
export async function getScholarById(scholarId: string): Promise<Scholar | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  try {
    const db = getFirestoreDB();
    const scholarRef = doc(db, 'scholars', scholarId);
    const scholarSnap = await getDoc(scholarRef);

    if (!scholarSnap.exists()) {
      return null;
    }

    const data = scholarSnap.data();
    return {
      id: scholarSnap.id,
      email: data.email || '',
      fullName: data.fullName || '',
      bio: data.bio || '',
      photoUrl: data.photoUrl,
      verified: data.verified || false,
      role: 'scholar',
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error getting scholar:', error);
    return null;
  }
}

/**
 * Get all verified scholars
 */
export async function getAllScholars(): Promise<Scholar[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  try {
    const db = getFirestoreDB();
    const scholarsRef = collection(db, 'scholars');
    const q = query(scholarsRef, where('verified', '==', true));
    const snapshot = await getDocs(q);

    const scholars: Scholar[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      scholars.push({
        id: docSnap.id,
        email: data.email || '',
        fullName: data.fullName || '',
        bio: data.bio || '',
        photoUrl: data.photoUrl,
        verified: data.verified || false,
        role: 'scholar',
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    });

    return scholars.sort((a, b) => a.fullName.localeCompare(b.fullName));
  } catch (error) {
    console.error('Error getting all scholars:', error);
    return [];
  }
}

/**
 * Create or update scholar profile
 */
export async function upsertScholar(scholar: Omit<Scholar, 'createdAt'>): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured');
  }

  try {
    const db = getFirestoreDB();
    const scholarRef = doc(db, 'scholars', scholar.id);
    
    await setDoc(
      scholarRef,
      {
        email: scholar.email,
        fullName: scholar.fullName,
        bio: scholar.bio,
        photoUrl: scholar.photoUrl || null,
        verified: scholar.verified,
        role: 'scholar',
        updatedAt: new Date(),
      },
      { merge: true }
    );
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
