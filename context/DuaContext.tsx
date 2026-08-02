/**
 * Dua Request Context
 * Global state management for Dua requests
 */

import { DuaCategory, DuaRequest, UserGender } from '@/types/dua';
import { useStartupPhase } from '@/context/StartupPhaseContext';
import * as duaService from '@/utils/duaService';
import * as duaStorage from '@/utils/duaStorage';
import * as duaSync from '@/utils/duaSync';
import { processDueDuaAnswers } from '@/utils/duaAgent';
import {
  getSeenDuaRequestIds,
  getUnreadDuaCount,
  markDuaRequestSeen,
} from '@/utils/duaUnread';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { AppState, InteractionManager } from 'react-native';

interface DuaState {
  requests: DuaRequest[];
  isLoading: boolean;
  error: string | null;
  userId: string | null;
}

type DuaAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_REQUESTS'; payload: DuaRequest[] }
  | { type: 'ADD_REQUEST'; payload: DuaRequest }
  | { type: 'UPDATE_REQUEST'; payload: DuaRequest }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER_ID'; payload: string };

function duaReducer(state: DuaState, action: DuaAction): DuaState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_REQUESTS':
      return { ...state, requests: action.payload };
    case 'ADD_REQUEST':
      return { ...state, requests: [action.payload, ...state.requests] };
    case 'UPDATE_REQUEST':
      return {
        ...state,
        requests: state.requests.map((r) => (r.id === action.payload.id ? action.payload : r)),
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_USER_ID':
      return { ...state, userId: action.payload };
    default:
      return state;
  }
}

const initialState: DuaState = {
  requests: [],
  isLoading: true,
  error: null,
  userId: null,
};

interface DuaContextType {
  state: DuaState;
  unreadCount: number;
  isRequestUnread: (id: string) => boolean;
  markRequestSeen: (id: string) => Promise<void>;
  submitRequest: (
    category: DuaCategory,
    message: string,
    isAnonymous: boolean,
    gender: UserGender
  ) => Promise<DuaRequest>;
  refreshRequests: (options?: { silent?: boolean }) => Promise<void>;
  getRequestById: (id: string) => Promise<DuaRequest | null>;
  syncPending: () => Promise<void>;
}

const DuaContext = createContext<DuaContextType | undefined>(undefined);

export function DuaProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(duaReducer, initialState);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const { isInteractiveReady, isAdhanSettled } = useStartupPhase();
  const stateRef = useRef(state);
  stateRef.current = state;

  const reloadSeen = useCallback(async () => {
    const ids = await getSeenDuaRequestIds();
    setSeenIds(ids);
  }, []);

  // Initialize user ID and load requests after adhan settles.
  useEffect(() => {
    if (!isAdhanSettled) {
      return;
    }

    let cancelled = false;
    let interactionTask: { cancel: () => void } | null = null;
    const timer = setTimeout(() => {
      interactionTask = InteractionManager.runAfterInteractions(() => {
        if (!cancelled) {
          void initialize();
        }
      });
    }, 28_000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      interactionTask?.cancel();
    };
  }, [isAdhanSettled]);

  const refreshRequests = useCallback(async (options?: { silent?: boolean }) => {
    const current = stateRef.current;
    const silent = options?.silent === true || current.requests.length > 0;

    if (!current.userId) {
      const userId = await duaStorage.getOrCreateUserId();
      dispatch({ type: 'SET_USER_ID', payload: userId });
    }

    try {
      if (!silent) {
        dispatch({ type: 'SET_LOADING', payload: true });
      }
      // Throttled: publish due answers without spamming on every sync/tab focus
      void processDueDuaAnswers();
      const userId = stateRef.current.userId || (await duaStorage.getOrCreateUserId());
      const requests = await duaService.getUserRequests(userId);
      dispatch({ type: 'SET_REQUESTS', payload: requests });
      await reloadSeen();
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      console.error('Failed to refresh requests:', error);
      const cached = await duaStorage.getCachedRequests();
      const userId = stateRef.current.userId || (await duaStorage.getOrCreateUserId());
      const userCached = cached.filter((r) => r.userId === userId);
      dispatch({ type: 'SET_REQUESTS', payload: userCached });
      dispatch({ type: 'SET_ERROR', payload: 'خطا در بارگذاری. نمایش داده‌های ذخیره شده.' });
    } finally {
      if (!silent) {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  }, [reloadSeen]);

  // Start auto-sync (silent refresh — no loading spinner churn on tabs)
  useEffect(() => {
    if (!isAdhanSettled) {
      return;
    }

    const cleanup = duaSync.startAutoSync();
    const unsubscribe = duaSync.addSyncListener(() => {
      void refreshRequests({ silent: true });
    });
    return () => {
      cleanup();
      unsubscribe();
    };
  }, [isAdhanSettled, refreshRequests]);

  // Ping scheduler when app returns to foreground (throttled process_due + silent refresh)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void processDueDuaAnswers().then(() => refreshRequests({ silent: true }));
      }
    });
    return () => sub.remove();
  }, [refreshRequests]);

  // Setup notification listener
  useEffect(() => {
    if (!isAdhanSettled) {
      return;
    }

    let cleanup: (() => void) | undefined;

    const setupNotifications = async () => {
      try {
        const { setupNotificationListener, registerDeviceToken } = await import('@/utils/duaNotifications');

        if (state.userId) {
          registerDeviceToken(state.userId).catch(console.error);
        }

        cleanup = await setupNotificationListener(() => {
          void refreshRequests({ silent: true });
        });
      } catch (error) {
        console.error('Failed to setup notifications:', error);
      }
    };

    setupNotifications();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [isInteractiveReady, refreshRequests, state.userId]);

  async function initialize() {
    try {
      const userId = await duaStorage.getOrCreateUserId();
      dispatch({ type: 'SET_USER_ID', payload: userId });
      await reloadSeen();
      await refreshRequests({ silent: false });
    } catch (error) {
      console.error('Failed to initialize Dua context:', error);
      dispatch({ type: 'SET_ERROR', payload: 'خطا در بارگذاری درخواست‌ها' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }

  const submitRequest = useCallback(
    async (
      category: DuaCategory,
      message: string,
      isAnonymous: boolean,
      gender: UserGender
    ): Promise<DuaRequest> => {
      if (!stateRef.current.userId) {
        const userId = await duaStorage.getOrCreateUserId();
        dispatch({ type: 'SET_USER_ID', payload: userId });
      }

      try {
        dispatch({ type: 'SET_ERROR', payload: null });
        const userId = stateRef.current.userId || (await duaStorage.getOrCreateUserId());

        try {
          const { registerDeviceToken } = await import('@/utils/duaNotifications');
          await registerDeviceToken(userId);
        } catch (tokenError) {
          console.warn('Device token registration before submit failed:', tokenError);
        }

        const request = await duaService.submitRequest({
          userId,
          category,
          message,
          gender,
          isAnonymous,
        });

        dispatch({ type: 'ADD_REQUEST', payload: request });
        await duaStorage.cacheRequest(request);
        duaSync.syncIfOnline();

        return request;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'خطا در ارسال درخواست';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        throw error;
      }
    },
    []
  );

  const getRequestById = useCallback(async (id: string): Promise<DuaRequest | null> => {
    try {
      const request = await duaService.getRequestById(id);
      if (request) {
        dispatch({ type: 'UPDATE_REQUEST', payload: request });
        await duaStorage.cacheRequest(request);
      }
      return request;
    } catch (error) {
      console.error('Failed to get request:', error);
      return await duaStorage.getCachedRequestById(id);
    }
  }, []);

  const syncPending = useCallback(async () => {
    await duaSync.forceSync();
    await refreshRequests({ silent: true });
  }, [refreshRequests]);

  const markRequestSeen = useCallback(async (id: string) => {
    await markDuaRequestSeen(id);
    setSeenIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const isRequestUnread = useCallback(
    (id: string) => {
      const req = state.requests.find((r) => r.id === id);
      return !!req && req.status === 'answered' && !seenIds.has(id);
    },
    [state.requests, seenIds]
  );

  const unreadCount = useMemo(
    () => getUnreadDuaCount(state.requests, seenIds),
    [state.requests, seenIds]
  );

  const value = useMemo<DuaContextType>(
    () => ({
      state,
      unreadCount,
      isRequestUnread,
      markRequestSeen,
      submitRequest,
      refreshRequests,
      getRequestById,
      syncPending,
    }),
    [
      state,
      unreadCount,
      isRequestUnread,
      markRequestSeen,
      submitRequest,
      refreshRequests,
      getRequestById,
      syncPending,
    ]
  );

  return <DuaContext.Provider value={value}>{children}</DuaContext.Provider>;
}

export function useDua() {
  const context = useContext(DuaContext);
  if (!context) {
    throw new Error('useDua must be used within a DuaProvider');
  }
  return context;
}
