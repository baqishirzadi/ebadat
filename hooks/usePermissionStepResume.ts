import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function usePermissionStepResume<T>(checkFn: () => Promise<T>, initial: T) {
  const [status, setStatus] = useState<T>(initial);
  const checkRef = useRef(checkFn);
  checkRef.current = checkFn;

  const refresh = useCallback(async () => {
    try {
      const next = await checkRef.current();
      setStatus(next);
    } catch {
      // Keep last known status.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => {});
    }, [refresh]),
  );

  useEffect(() => {
    const onChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        refresh().catch(() => {});
      }
    };
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [refresh]);

  return { status, refresh };
}
