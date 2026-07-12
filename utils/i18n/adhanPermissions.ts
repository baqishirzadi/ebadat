import fa from '@/locales/fa.json';
import ps from '@/locales/ps.json';

type NestedRecord = { [key: string]: string | string[] | NestedRecord };

const catalogs: Record<string, NestedRecord> = {
  fa: fa as NestedRecord,
  ps: ps as NestedRecord,
};

function resolvePath(obj: NestedRecord, path: string): string | string[] | undefined {
  const parts = path.split('.');
  let current: string | string[] | NestedRecord | undefined = obj;
  for (const part of parts) {
    if (current == null || typeof current === 'string' || Array.isArray(current)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

export function tAdhanPermission(
  key: string,
  locale: 'fa' | 'ps' = 'fa',
): string {
  const primary = resolvePath(catalogs[locale] ?? catalogs.fa, key);
  if (typeof primary === 'string' && primary.length > 0) {
    return primary;
  }
  const fallback = resolvePath(catalogs.fa, key);
  if (typeof fallback === 'string') {
    return fallback;
  }
  return key;
}

export function tAdhanPermissionSteps(
  oemKey: string,
  locale: 'fa' | 'ps' = 'fa',
): string[] {
  const path = `adhanPermissions.oemSteps.${oemKey}`;
  const primary = resolvePath(catalogs[locale] ?? catalogs.fa, path);
  if (Array.isArray(primary) && primary.length > 0) {
    return primary.filter((item): item is string => typeof item === 'string');
  }
  const fallback = resolvePath(catalogs.fa, path);
  if (Array.isArray(fallback)) {
    return fallback.filter((item): item is string => typeof item === 'string');
  }
  const defaultSteps = resolvePath(catalogs.fa, 'adhanPermissions.oemSteps.default');
  if (Array.isArray(defaultSteps)) {
    return defaultSteps.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

export function resolveOemGuideKey(manufacturer: string): string {
  const normalized = manufacturer.toLowerCase();
  if (normalized.includes('xiaomi') || normalized.includes('redmi') || normalized.includes('poco')) {
    return 'xiaomi';
  }
  if (normalized.includes('huawei') || normalized.includes('honor')) {
    return 'huawei';
  }
  if (normalized.includes('oppo') || normalized.includes('realme') || normalized.includes('oneplus')) {
    return 'oppo';
  }
  if (normalized.includes('vivo') || normalized.includes('iqoo')) {
    return 'vivo';
  }
  if (normalized.includes('samsung')) {
    return 'samsung';
  }
  return 'default';
}
