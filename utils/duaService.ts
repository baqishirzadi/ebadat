/**
 * Dua Request Service
 * Handles API calls to Firebase Firestore
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirestoreDB, isFirebaseConfigured } from './firebase';
import { DuaRequest, UserMetadata } from '@/types/dua';
import * as duaStorage from './duaStorage';

/**
 * Check if online and Firebase is configured
 */
function isAvailable(): boolean {
  return isFirebaseConfigured();
}

/**
 * Convert Firestore timestamp to Date
 */
function timestampToDate(timestamp: any): Date {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return new Date();
}

/**
 * Convert DuaRequest to Firestore format
 */
function requestToFirestore(request: DuaRequest): any {
  return {
    userId: request.userId,
    category: request.category,
    message: request.message,
    isAnonymous: request.isAnonymous,
    status: request.status,
    createdAt: request.createdAt instanceof Date ? Timestamp.fromDate(request.createdAt) : serverTimestamp(),
    answeredAt: request.answeredAt ? Timestamp.fromDate(request.answeredAt) : null,
    response: request.response || null,
    reviewerId: request.reviewerId || null,
    reviewerName: request.reviewerName || null,
  };
}

/**
 * Convert Firestore document to DuaRequest
 */
function firestoreToRequest(docData: any, id: string): DuaRequest {
  return {
    id,
    userId: docData.userId,
    category: docData.category,
    message: docData.message,
    isAnonymous: docData.isAnonymous || false,
    status: docData.status || 'pending',
    createdAt: timestampToDate(docData.createdAt),
    answeredAt: docData.answeredAt ? timestampToDate(docData.answeredAt) : undefined,
    response: docData.response || undefined,
    reviewerId: docData.reviewerId || undefined,
    reviewerName: docData.reviewerName || undefined,
  };
}

/**
 * Submit a new request
 */
export async function submitRequest(request: Omit<DuaRequest, 'id' | 'createdAt' | 'status'>): Promise<DuaRequest> {
  if (!isAvailable()) {
    // Save offline and return
    const userId = await duaStorage.getOrCreateUserId();
    const offlineRequest: DuaRequest = {
      ...request,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: new Date(),
    };
    await duaStorage.savePendingRequest(offlineRequest);
    await duaStorage.addToSyncQueue(offlineRequest.id);
    return offlineRequest;
  }

  try {
    const db = getFirestoreDB();
    const userId = await duaStorage.getOrCreateUserId();
    
    const requestData = {
      ...request,
      userId,
      status: 'pending' as const,
      createdAt: new Date(),
    };

    const firestoreData = requestToFirestore(requestData);
    const docRef = await addDoc(collection(db, 'dua_requests'), firestoreData);
    
    const submittedRequest: DuaRequest = {
      ...requestData,
      id: docRef.id,
    };

    // Cache locally
    await duaStorage.cacheRequest(submittedRequest);

    return submittedRequest;
  } catch (error) {
    console.error('Failed to submit request:', error);
    // Fallback to offline storage
    const userId = await duaStorage.getOrCreateUserId();
    const offlineRequest: DuaRequest = {
      ...request,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: new Date(),
    };
    await duaStorage.savePendingRequest(offlineRequest);
    await duaStorage.addToSyncQueue(offlineRequest.id);
    throw error;
  }
}

/**
 * Get user's requests
 */
export async function getUserRequests(userId: string): Promise<DuaRequest[]> {
  // Try to get from cache first
  const cached = await duaStorage.getCachedRequests();
  const userCached = cached.filter((r) => r.userId === userId);

  if (!isAvailable()) {
    return userCached;
  }

  try {
    const db = getFirestoreDB();
    const q = query(
      collection(db, 'dua_requests'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const snapshot = await getDocs(q);
    const requests: DuaRequest[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      requests.push(firestoreToRequest(data, doc.id));
    });

    // Cache all requests
    for (const request of requests) {
      await duaStorage.cacheRequest(request);
    }

    return requests;
  } catch (error) {
    console.error('Failed to get user requests:', error);
    return userCached;
  }
}

/**
 * Get request by ID
 */
export async function getRequestById(requestId: string): Promise<DuaRequest | null> {
  // Check cache first
  const cached = await duaStorage.getCachedRequestById(requestId);
  if (cached) {
    return cached;
  }

  if (!isAvailable()) {
    return null;
  }

  try {
    const db = getFirestoreDB();
    const docRef = doc(db, 'dua_requests', requestId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const request = firestoreToRequest(docSnap.data(), docSnap.id);
    await duaStorage.cacheRequest(request);
    return request;
  } catch (error) {
    console.error('Failed to get request:', error);
    return null;
  }
}

/**
 * Update user metadata (device token, notification settings)
 */
export async function updateUserMetadata(metadata: Partial<UserMetadata>): Promise<void> {
  if (!isAvailable()) {
    return;
  }

  try {
    const db = getFirestoreDB();
    const userId = await duaStorage.getOrCreateUserId();
    const userRef = doc(db, 'users', userId);

    const updateData: any = {};
    if (metadata.deviceToken !== undefined) {
      updateData.deviceToken = metadata.deviceToken;
    }
    if (metadata.notificationEnabled !== undefined) {
      updateData.notificationEnabled = metadata.notificationEnabled;
    }

    await updateDoc(userRef, updateData);
  } catch (error) {
    // If document doesn't exist, create it
    try {
      const db = getFirestoreDB();
      const userId = await duaStorage.getOrCreateUserId();
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        id: userId,
        deviceToken: metadata.deviceToken || null,
        notificationEnabled: metadata.notificationEnabled ?? true,
        createdAt: serverTimestamp(),
      });
    } catch (createError) {
      console.error('Failed to create/update user metadata:', createError);
    }
  }
}

/**
 * Sync pending requests (called when coming online)
 */
export async function syncPendingRequests(): Promise<void> {
  if (!isAvailable()) {
    return;
  }

  try {
    const pending = await duaStorage.getPendingRequests();
    const queue = await duaStorage.getSyncQueue();

    for (const request of pending) {
      if (queue.includes(request.id)) {
        try {
          // Try to submit to Firestore
          const db = getFirestoreDB();
          const firestoreData = requestToFirestore(request);
          const docRef = await addDoc(collection(db, 'dua_requests'), firestoreData);

          // Update local cache with new ID
          const syncedRequest: DuaRequest = {
            ...request,
            id: docRef.id,
          };
          await duaStorage.cacheRequest(syncedRequest);
          await duaStorage.removePendingRequest(request.id);
          await duaStorage.removeFromSyncQueue(request.id);
        } catch (error) {
          console.error(`Failed to sync request ${request.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Failed to sync pending requests:', error);
  }
}
