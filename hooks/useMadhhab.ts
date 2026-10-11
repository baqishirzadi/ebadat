import { useSyncExternalStore } from 'react';

import { getActiveMadhhab, subscribeActiveMadhhab, type MadhhabKey } from '@/utils/madhhab';

export function useMadhhab(): MadhhabKey {
  return useSyncExternalStore(subscribeActiveMadhhab, getActiveMadhhab, getActiveMadhhab);
}
