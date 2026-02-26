import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { updateUserMetadata } from '@/utils/duaService';

const STORAGE_KEYS = {
  PROMPT_SHOWN: '@ebadat/articles_push_prompt_shown',
  TOKEN_HASH: '@ebadat/articles_push_token_hash',
};

let registrationInFlight: Promise<void> | null = null;

function isExpoGo(): boolean {
  try {
    return (
      Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === Constants.ExecutionEnvironment?.StoreClient
    );
  } catch {
    return false;
  }
}

function hashToken(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function getProjectId(): string {
  return (
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    (Constants as any).manifest?.extra?.eas?.projectId ||
    ''
  );
}

async function registerTokenIfChanged(projectId: string): Promise<void> {
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  const tokenHash = hashToken(token.data);
  const previousHash = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_HASH);

  if (previousHash === tokenHash) {
    return;
  }

  await updateUserMetadata({
    deviceToken: token.data,
    notificationEnabled: true,
  });
  await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_HASH, tokenHash);
}

async function runArticlePushRegistration(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (isExpoGo()) return;

  const projectId = getProjectId();
  if (!projectId) {
    if (__DEV__) {
      console.warn('[ArticlePush] Missing EAS projectId; skipping token registration.');
    }
    return;
  }

  const promptShown = (await AsyncStorage.getItem(STORAGE_KEYS.PROMPT_SHOWN)) === '1';
  let permission = await Notifications.getPermissionsAsync();

  if (permission.status !== 'granted') {
    if (!promptShown) {
      permission = await Notifications.requestPermissionsAsync();
      await AsyncStorage.setItem(STORAGE_KEYS.PROMPT_SHOWN, '1');
    } else {
      return;
    }
  } else if (!promptShown) {
    await AsyncStorage.setItem(STORAGE_KEYS.PROMPT_SHOWN, '1');
  }

  if (permission.status !== 'granted') {
    return;
  }

  await registerTokenIfChanged(projectId);
}

export async function ensureArticlePushRegistrationOnFirstOpen(): Promise<void> {
  if (registrationInFlight) {
    return registrationInFlight;
  }

  registrationInFlight = runArticlePushRegistration()
    .catch((error) => {
      if (__DEV__) {
        console.warn('[ArticlePush] Registration failed:', error);
      }
    })
    .finally(() => {
      registrationInFlight = null;
    });

  return registrationInFlight;
}
