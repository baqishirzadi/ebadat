/**
 * Dua Request Notifications
 * Handles push notifications for request responses
 */

import { Platform } from 'react-native';
import { getFirestoreDB, isFirebaseConfigured } from './firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import * as duaStorage from './duaStorage';

// Conditional import - only load on native platforms, not in Expo Go
let Notifications: typeof import('expo-notifications') | null = null;

/**
 * Send notification to user when their request is answered
 * This is called from Cloud Function or admin interface
 */
export async function sendNotificationToUser(userId: string, requestId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase not configured, skipping notification');
    return;
  }

  try {
    const db = getFirestoreDB();
    
    // Get user metadata to find device token
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.warn('User not found for notification');
      return;
    }

    const userData = userSnap.data();
    const deviceToken = userData.deviceToken;
    const notificationEnabled = userData.notificationEnabled !== false; // Default to true

    if (!deviceToken || !notificationEnabled) {
      console.log('User has no device token or notifications disabled');
      return;
    }

    // Get request details
    const requestRef = doc(db, 'dua_requests', requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      console.warn('Request not found');
      return;
    }

    const requestData = requestSnap.data();

    // Load Notifications module if not already loaded
    if (!Notifications) {
      try {
        Notifications = await import('expo-notifications');
      } catch (error) {
        console.error('Failed to load expo-notifications:', error);
        return;
      }
    }

    if (!Notifications) {
      return;
    }

    // Send notification via Expo Notifications
    // Note: For production, you'd use FCM directly or a Cloud Function
    // For now, we'll schedule a local notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'پاسخ به درخواست شما',
        body: `پاسخ به درخواست شما آماده است. برای مشاهده پاسخ، اینجا را بزنید.`,
        data: {
          type: 'dua_response',
          requestId,
          userId,
        },
        sound: true,
      },
      trigger: null, // Show immediately
    });

    console.log('Notification sent to user:', userId);
  } catch (error) {
    console.error('Failed to send notification:', error);
    throw error;
  }
}

/**
 * Register device token for notifications
 */
export async function registerDeviceToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') {
    return; // Notifications not supported on web
  }

  // Check if running in Expo Go (SDK 53+ doesn't support remote push)
  // Multiple detection methods for reliability
  let isExpoGo = false;
  try {
    const Constants = await import('expo-constants');
    const executionEnv = Constants.default.executionEnvironment;
    // StoreClient = Expo Go, Bare = development build, Standalone = production build
    isExpoGo = executionEnv === Constants.ExecutionEnvironment.StoreClient;
    // Also check appOwnership - Expo Go has 'expo' ownership
    const appOwnership = Constants.default.appOwnership || 'unknown';
    if (appOwnership === 'expo') {
      isExpoGo = true;
    }
  } catch (error) {
    // Silently handle detection errors
  }

  if (isExpoGo) {
    console.log('Skipping notification registration: Expo Go detected (remote push not supported in SDK 53+)');
    return; // Remote push notifications not supported in Expo Go SDK 53+
  }

  // Load Notifications module if not already loaded
  if (!Notifications) {
    try {
      Notifications = await import('expo-notifications');
    } catch (error) {
      console.error('Failed to load expo-notifications:', error);
      return;
    }
  }

  if (!Notifications) {
    return;
  }

  try {
    // Request notification permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    // Get projectId from Constants or environment variable
    let projectId: string | undefined;
    try {
      const Constants = await import('expo-constants');
      projectId = Constants.default.expoConfig?.extra?.eas?.projectId;
    } catch (error) {
      // Silently handle Constants import errors
    }

    if (!projectId) {
      projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
    }

    if (!projectId || projectId === 'your-project-id') {
      console.warn('Skipping notification registration: Invalid or missing projectId');
      return;
    }

    // Get Expo push token
    // Note: This will fail in Expo Go SDK 53+ - we catch and handle gracefully
    let token;
    try {
      token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
    } catch (pushTokenError: any) {
      // If this is an Expo Go error (remote push not supported), fail silently
      const errorMessage = pushTokenError?.message || '';
      if (errorMessage.includes('remote notifications') || 
          errorMessage.includes('Expo Go') ||
          errorMessage.includes('VALIDATION_ERROR')) {
        console.log('Skipping notification registration: Remote push not supported in Expo Go');
        return;
      }
      
      // Re-throw other errors
      throw pushTokenError;
    }

    // Save locally
    await duaStorage.saveDeviceToken(token.data);

    // Update in Firestore
    if (isFirebaseConfigured()) {
      try {
        const db = getFirestoreDB();
        const userRef = doc(db, 'users', userId);
        
        // Try to update, create if doesn't exist
        try {
          await updateDoc(userRef, {
            deviceToken: token.data,
            notificationEnabled: true,
          });
        } catch (updateError: any) {
          // Document doesn't exist, create it
          if (updateError.code === 'not-found') {
            const { setDoc } = await import('firebase/firestore');
            await setDoc(userRef, {
              id: userId,
              deviceToken: token.data,
              notificationEnabled: true,
              createdAt: serverTimestamp(),
            });
          } else {
            throw updateError;
          }
        }
      } catch (firestoreError) {
        console.error('Failed to update Firestore with device token:', firestoreError);
        // Continue anyway - token is saved locally
      }
    }
  } catch (error) {
    console.error('Failed to register device token:', error);
  }
}

/**
 * Setup notification listener for response notifications
 */
export async function setupNotificationListener(
  onNotificationReceived: (requestId: string) => void
): Promise<() => void> {
  if (Platform.OS === 'web') {
    return () => {}; // Notifications not supported on web
  }

  // Load Notifications module if not already loaded
  if (!Notifications) {
    try {
      Notifications = await import('expo-notifications');
    } catch (error) {
      console.error('Failed to load expo-notifications:', error);
      return () => {};
    }
  }

  if (!Notifications) {
    return () => {};
  }

  // Listen for notification received (foreground)
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    const { type, requestId } = notification.request.content.data || {};
    if (type === 'dua_response' && requestId) {
      console.log('Dua response notification received:', requestId);
      onNotificationReceived(requestId);
    }
  });

  // Listen for notification response (user tapped)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const { type, requestId } = response.notification.request.content.data || {};
    if (type === 'dua_response' && requestId) {
      console.log('Dua response notification tapped:', requestId);
      onNotificationReceived(requestId);
    }
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
