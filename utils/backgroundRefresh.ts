import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { triggerPrayerScheduleFromBackground } from '@/utils/prayerScheduleCoordinator';

export const ADHAN_BACKGROUND_TASK = 'ebadat-adhan-schedule-refresh';

TaskManager.defineTask(ADHAN_BACKGROUND_TASK, async () => {
  try {
    const handled = await triggerPrayerScheduleFromBackground('ios-background-task');
    return handled ? BackgroundTask.BackgroundTaskResult.Success : BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    if (__DEV__) {
      console.warn('[BackgroundRefresh] Task failed:', error);
    }
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

let registrationAttempted = false;

export async function registerAdhanBackgroundRefresh(): Promise<void> {
  if (Platform.OS !== 'ios' || registrationAttempted) return;
  registrationAttempted = true;

  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
      if (__DEV__) {
        console.log('[BackgroundRefresh] Background tasks restricted on this device');
      }
      return;
    }

    await BackgroundTask.registerTaskAsync(ADHAN_BACKGROUND_TASK, {
      minimumInterval: 60 * 12,
    });

    if (__DEV__) {
      console.log('[BackgroundRefresh] Registered iOS background schedule refresh task');
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[BackgroundRefresh] Registration failed:', error);
    }
  }
}
