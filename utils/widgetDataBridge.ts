import { NativeModules, Platform } from 'react-native';

import type { WidgetSnapshot } from '@/utils/widgetSnapshot';

interface WidgetDataNativeModule {
  setSnapshot(json: string): Promise<boolean>;
  getSnapshot(): Promise<string | null>;
  reloadWidget(): Promise<boolean>;
}

function getModule(): WidgetDataNativeModule | null {
  const module = (NativeModules as { WidgetDataModule?: WidgetDataNativeModule }).WidgetDataModule;
  if (!module?.setSnapshot) return null;
  return module;
}

export function isWidgetBridgeAvailable(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function writeWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  if (!isWidgetBridgeAvailable()) return;
  const module = getModule();
  if (!module) return;

  try {
    await module.setSnapshot(JSON.stringify(snapshot));
    await module.reloadWidget();
  } catch (error) {
    console.warn('[WidgetDataBridge] Failed to write snapshot:', error);
  }
}

export async function readWidgetSnapshot(): Promise<WidgetSnapshot | null> {
  const module = getModule();
  if (!module?.getSnapshot) return null;

  try {
    const raw = await module.getSnapshot();
    if (!raw) return null;
    return JSON.parse(raw) as WidgetSnapshot;
  } catch {
    return null;
  }
}
