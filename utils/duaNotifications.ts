/**
 * Dua Request Notifications
 * Handles push notifications for request responses using Supabase
 */

import { Platform } from 'react-native';
import * as duaStorage from './duaStorage';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

// Conditional import - only load on native platforms, not in Expo Go
// We also need to completely skip ALL notification logic in Expo Go (SDK 53+),
// because remote push is not supported there and calling expo-notifications APIs
// like getExpoPushTokenAsync will crash the app.
let Notifications: typeof import('expo-notifications') | null = null;

// Runtime detection for Expo Go using appOwnership and executionEnvironment.
// This is synchronous so we can guard all notification calls at runtime.
const isExpoGo = (): boolean => {
  try {
    const Constants = require('expo-constants').default;
    return (
      Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === Constants.ExecutionEnvironment?.StoreClient
    );
  } catch {
    return false;
  }
};

/**
 * Send notification to user when their request is answered
 * This is called from Edge Function or admin interface
 */
export async function sendNotificationToUser(userId: string, requestId: string): Promise<void> {
  // Skip all notification work in Expo Go (no remote push support)
  if (isExpoGo()) {
    console.log('Skipping sendNotificationToUser: Expo Go detected (no remote push)');
    return;
  }

  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, skipping notification');
    return;
  }

  try {
    const supabase = getSupabaseClient();
    
    // Get user metadata to find device token
    const { data: userData, error: userError } = await supabase
      .from('user_metadata')
      .select('device_token, notification_enabled')
      .eq('user_id', userId)
      .single();
    
    if (userError || !userData) {
      console.warn('User not found for notification');
      return;
    }

    const deviceToken = userData.device_token;
    const notificationEnabled = userData.notification_enabled !== false; // Default to true

    if (!deviceToken || !notificationEnabled) {
      console.log('User has no device token or notifications disabled');
      return;
    }

    // Get request details
    const { data: requestData, error: requestError } = await supabase
      .from('dua_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    
    if (requestError || !requestData) {
      console.warn('Request not found');
      return;
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

    // Send notification via Expo Notifications
    // Note: For production, you'd use Supabase Edge Functions or Expo Push API
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

  // Skip ALL registration logic in Expo Go – remote push is not supported there
  if (isExpoGo()) {
    console.log('Skipping notification registration: Expo Go detected (no remote push)');
    return;
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
      // Try to get from Supabase URL (extract project ref)
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (supabaseUrl) {
        // Supabase URL format: https://<project-ref>.supabase.co
        const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
        if (match) {
          // Use Supabase project ref as fallback (though Expo Push needs EAS projectId)
          console.warn('Using Supabase project ref, but Expo Push requires EAS projectId');
        }
      }
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
      const errorMsg = pushTokenError?.message || '';
      const isFirebaseError = errorMsg.includes('Firebase');
      const isExpoGoError = errorMsg.includes('remote notifications') || errorMsg.includes('Expo Go');
      
      // If this is an Expo Go error (remote push not supported), fail silently
      if (isExpoGoError || errorMsg.includes('VALIDATION_ERROR')) {
        console.log('Skipping notification registration: Remote push not supported in Expo Go');
        return;
      }
      
      // If Firebase error, also fail silently (we're using Supabase now)
      if (isFirebaseError) {
        console.log('Skipping notification registration: Firebase not configured (using Supabase)');
        return;
      }
      
      // Re-throw other errors
      throw pushTokenError;
    }

    // Save locally
    await duaStorage.saveDeviceToken(token.data);

    // Update in Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        
        // Try to update existing record
        const { error: updateError } = await supabase
          .from('user_metadata')
          .update({
            device_token: token.data,
            notification_enabled: true,
          })
          .eq('user_id', userId);

        // If update fails (record doesn't exist), insert new record
        if (updateError) {
          const { error: insertError } = await supabase
            .from('user_metadata')
            .insert({
              user_id: userId,
              device_token: token.data,
              notification_enabled: true,
            });

          if (insertError) {
            console.error('Failed to create/update user metadata with device token:', insertError);
          }
        }
      } catch (supabaseError: any) {
        console.error('Failed to update Supabase with device token:', supabaseError);
        // Continue anyway - token is saved locally
      }
    }
  } catch (error: any) {
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

  // Skip listener registration entirely in Expo Go to avoid SDK 53 crashes
  if (isExpoGo()) {
    console.log('Skipping notification listeners: Expo Go detected (no remote push)');
    return () => {};
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
      // requestId comes from notification data (string in our payload), but TS sees it as unknown
      onNotificationReceived(String(requestId));
    }
  });

  // Listen for notification response (user tapped)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const { type, requestId } = response.notification.request.content.data || {};
    if (type === 'dua_response' && requestId) {
      console.log('Dua response notification tapped:', requestId);
      onNotificationReceived(String(requestId));
    }
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
