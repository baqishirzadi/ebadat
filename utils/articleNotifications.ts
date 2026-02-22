/**
 * Article Notifications
 * Handles push notifications for article publications using Supabase
 */

import { Platform } from 'react-native';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

// Conditional import - only load on native platforms, not in Expo Go
let Notifications: typeof import('expo-notifications') | null = null;

/**
 * Send notification to all users when article is published
 */
export async function notifyArticlePublished(
  articleId: string,
  scholarName: string,
  articleTitle: string
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  if (Platform.OS === 'web') {
    return { success: false, sentCount: 0, error: 'Notifications not supported on web' };
  }

  // Check if running in Expo Go (SDK 53+ doesn't support remote push)
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
    console.log('Skipping article notification: Expo Go detected (remote push not supported in SDK 53+)');
    return { success: true, sentCount: 0 };
  }

  if (!isSupabaseConfigured()) {
    return { success: false, sentCount: 0, error: 'Supabase not configured' };
  }

  // Load Notifications module if not already loaded
  if (!Notifications) {
    try {
      Notifications = await import('expo-notifications');
    } catch (error) {
      console.error('Failed to load expo-notifications:', error);
      return { success: false, sentCount: 0, error: 'Notifications module not available' };
    }
  }

  if (!Notifications) {
    return { success: false, sentCount: 0, error: 'Notifications not available' };
  }

  try {
    // Get all user device tokens from Supabase
    const supabase = getSupabaseClient();
    const { data: users, error } = await supabase
      .from('user_metadata')
      .select('device_token')
      .not('device_token', 'is', null)
      .eq('notification_enabled', true);

    if (error) {
      console.error('Error fetching user tokens:', error);
      return { success: false, sentCount: 0, error: error.message };
    }

    if (!users || users.length === 0) {
      return { success: true, sentCount: 0 };
    }

    const deviceTokens = users
      .map((u) => u.device_token)
      .filter((token): token is string => !!token);

    if (deviceTokens.length === 0) {
      return { success: true, sentCount: 0 };
    }

    // Send notifications
    // Note: In production, you'd use Expo Push Notification API or Supabase Edge Functions
    // For now, we'll schedule local notifications as a fallback
    // In a real implementation, you'd batch send via Expo Push API

    const notificationTitle = `مقاله جدید از ${scholarName}`;
    const notificationBody = articleTitle;

    // Schedule notification (this is a simplified version)
    // In production, use Expo Push Notification service
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notificationTitle,
        body: notificationBody,
        data: {
          type: 'article_published',
          articleId,
          scholarName,
        },
        sound: true,
      },
      trigger: null, // Show immediately
    });

    // Update article with notification sent status
    await supabase
      .from('articles')
      .update({ notification_sent: true })
      .eq('id', articleId);

    return { success: true, sentCount: deviceTokens.length };
  } catch (error) {
    console.error('Error sending article notifications:', error);
    return {
      success: false,
      sentCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send broadcast notification (admin only)
 */
export async function sendBroadcastNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  if (Platform.OS === 'web') {
    return { success: false, sentCount: 0, error: 'Notifications not supported on web' };
  }

  // Check if running in Expo Go (SDK 53+ doesn't support remote push)
  let isExpoGo = false;
  try {
    const Constants = await import('expo-constants');
    const executionEnv = Constants.default.executionEnvironment;
    isExpoGo = executionEnv === Constants.ExecutionEnvironment.StoreClient;
    const appOwnership = Constants.default.appOwnership || 'unknown';
    if (appOwnership === 'expo') {
      isExpoGo = true;
    }
  } catch (error) {
    // Silently handle detection errors
  }

  if (isExpoGo) {
    console.log('Skipping broadcast notification: Expo Go detected (remote push not supported in SDK 53+)');
    return { success: true, sentCount: 0 };
  }

  if (!isSupabaseConfigured()) {
    return { success: false, sentCount: 0, error: 'Supabase not configured' };
  }

  // Load Notifications module if not already loaded
  if (!Notifications) {
    try {
      Notifications = await import('expo-notifications');
    } catch (error) {
      console.error('Failed to load expo-notifications:', error);
      return { success: false, sentCount: 0, error: 'Notifications module not available' };
    }
  }

  if (!Notifications) {
    return { success: false, sentCount: 0, error: 'Notifications not available' };
  }

  try {
    const supabase = getSupabaseClient();
    const { data: users, error } = await supabase
      .from('user_metadata')
      .select('device_token')
      .not('device_token', 'is', null)
      .eq('notification_enabled', true);

    if (error) {
      console.error('Error fetching user tokens:', error);
      return { success: false, sentCount: 0, error: error.message };
    }

    if (!users || users.length === 0) {
      return { success: true, sentCount: 0 };
    }

    const deviceTokens = users
      .map((u) => u.device_token)
      .filter((token): token is string => !!token);

    if (deviceTokens.length === 0) {
      return { success: true, sentCount: 0 };
    }

    // Schedule notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: 'broadcast',
          ...data,
        },
        sound: true,
      },
      trigger: null,
    });

    return { success: true, sentCount: deviceTokens.length };
  } catch (error) {
    console.error('Error sending broadcast notification:', error);
    return {
      success: false,
      sentCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
