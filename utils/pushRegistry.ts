import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { updateUserMetadata } from '@/utils/duaService';

const STORAGE_KEYS = {
  PROMPT_SHOWN: '@ebadat/push_prompt_shown',
  TOKEN_HASH: '@ebadat/push_token_hash',
  LEGACY_PROMPT_SHOWN: '@ebadat/articles_push_prompt_shown',
  LEGACY_TOKEN_HASH: '@ebadat/articles_push_token_hash',
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

async function readPromptShown(): Promise<boolean> {
  const next = await AsyncStorage.getItem(STORAGE_KEYS.PROMPT_SHOWN);
  if (next === '1') return true;

  const legacy = await AsyncStorage.getItem(STORAGE_KEYS.LEGACY_PROMPT_SHOWN);
  if (legacy === '1') {
    await AsyncStorage.setItem(STORAGE_KEYS.PROMPT_SHOWN, '1');
    return true;
  }

  return false;
}

async function writePromptShown(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.PROMPT_SHOWN, '1');
  await AsyncStorage.setItem(STORAGE_KEYS.LEGACY_PROMPT_SHOWN, '1');
}

async function readTokenHash(): Promise<string | null> {
  const next = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_HASH);
  if (next) return next;

  const legacy = await AsyncStorage.getItem(STORAGE_KEYS.LEGACY_TOKEN_HASH);
  if (legacy) {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_HASH, legacy);
    return legacy;
  }

  return null;
}

async function writeTokenHash(value: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_HASH, value);
  await AsyncStorage.setItem(STORAGE_KEYS.LEGACY_TOKEN_HASH, value);
}

async function registerTokenIfChanged(projectId: string): Promise<void> {
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  const tokenHash = hashToken(token.data);
  const previousHash = await readTokenHash();

  if (previousHash === tokenHash) {
    return;
  }

  await updateUserMetadata({
    deviceToken: token.data,
    notificationEnabled: true,
  });
  await writeTokenHash(tokenHash);
}

async function runPushRegistration(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (isExpoGo()) return;

  const projectId = getProjectId();
  if (!projectId) {
    if (__DEV__) {
      console.warn('[PushRegistry] Missing EAS projectId; skipping token registration.');
    }
    return;
  }

  const promptShown = await readPromptShown();
  let permission = await Notifications.getPermissionsAsync();

  if (permission.status !== 'granted') {
    if (!promptShown) {
      permission = await Notifications.requestPermissionsAsync();
      await writePromptShown();
    } else {
      return;
    }
  } else if (!promptShown) {
    await writePromptShown();
  }

  if (permission.status !== 'granted') {
    return;
  }

  await registerTokenIfChanged(projectId);
}

export async function ensurePushRegistrationOnFirstOpen(): Promise<void> {
  if (registrationInFlight) {
    return registrationInFlight;
  }

  registrationInFlight = runPushRegistration()
    .catch((error) => {
      if (__DEV__) {
        console.warn('[PushRegistry] Registration failed:', error);
      }
    })
    .finally(() => {
      registrationInFlight = null;
    });

  return registrationInFlight;
}
