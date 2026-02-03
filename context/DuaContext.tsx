/**
 * Dua Request Context
 * Global state management for Dua requests
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { DuaRequest, DuaCategory } from '@/types/dua';
import * as duaService from '@/utils/duaService';
import * as duaStorage from '@/utils/duaStorage';
import * as duaSync from '@/utils/duaSync';

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
  submitRequest: (category: DuaCategory, message: string, isAnonymous: boolean) => Promise<DuaRequest>;
  refreshRequests: () => Promise<void>;
  getRequestById: (id: string) => Promise<DuaRequest | null>;
  syncPending: () => Promise<void>;
}

const DuaContext = createContext<DuaContextType | undefined>(undefined);

export function DuaProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(duaReducer, initialState);

  // Initialize user ID and load requests
  useEffect(() => {
    initialize();
  }, []);

  // Start auto-sync
  useEffect(() => {
    const cleanup = duaSync.startAutoSync();
    const unsubscribe = duaSync.addSyncListener(() => {
      refreshRequests();
    });
    return () => {
      cleanup();
      unsubscribe();
    };
  }, []);

  // Setup notification listener
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    const setupNotifications = async () => {
      try {
        const { setupNotificationListener, registerDeviceToken } = await import('@/utils/duaNotifications');
        
        // Register device token
        if (state.userId) {
          registerDeviceToken(state.userId).catch(console.error);
        }
        
        // Setup listener
        cleanup = await setupNotificationListener((requestId: string) => {
          // Refresh requests when notification is received
          refreshRequests();
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
  }, [refreshRequests, state.userId]);

  async function initialize() {
    try {
      const userId = await duaStorage.getOrCreateUserId();
      dispatch({ type: 'SET_USER_ID', payload: userId });
      await refreshRequests();
    } catch (error) {
      console.error('Failed to initialize Dua context:', error);
      dispatch({ type: 'SET_ERROR', payload: 'خطا در بارگذاری درخواست‌ها' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }

  const submitRequest = useCallback(
    async (category: DuaCategory, message: string, isAnonymous: boolean): Promise<DuaRequest> => {
      if (!state.userId) {
        const userId = await duaStorage.getOrCreateUserId();
        dispatch({ type: 'SET_USER_ID', payload: userId });
      }

      try {
        dispatch({ type: 'SET_ERROR', payload: null });
        const userId = state.userId || (await duaStorage.getOrCreateUserId());

        const request = await duaService.submitRequest({
          userId,
          category,
          message,
          isAnonymous,
        });

        dispatch({ type: 'ADD_REQUEST', payload: request });
        await duaStorage.cacheRequest(request);

        // Try to sync if online
        duaSync.syncIfOnline();

        return request;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'خطا در ارسال درخواست';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        throw error;
      }
    },
    [state.userId]
  );

  const refreshRequests = useCallback(async () => {
    if (!state.userId) {
      const userId = await duaStorage.getOrCreateUserId();
      dispatch({ type: 'SET_USER_ID', payload: userId });
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const userId = state.userId || (await duaStorage.getOrCreateUserId());
      const requests = await duaService.getUserRequests(userId);
      dispatch({ type: 'SET_REQUESTS', payload: requests });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      console.error('Failed to refresh requests:', error);
      // Try to load from cache
      const cached = await duaStorage.getCachedRequests();
      const userId = state.userId || (await duaStorage.getOrCreateUserId());
      const userCached = cached.filter((r) => r.userId === userId);
      dispatch({ type: 'SET_REQUESTS', payload: userCached });
      dispatch({ type: 'SET_ERROR', payload: 'خطا در بارگذاری. نمایش داده‌های ذخیره شده.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.userId]);

  const getRequestById = useCallback(async (id: string): Promise<DuaRequest | null> => {
    try {
      const request = await duaService.getRequestById(id);
      if (request) {
        // Update in state if exists
        dispatch({ type: 'UPDATE_REQUEST', payload: request });
        await duaStorage.cacheRequest(request);
      }
      return request;
    } catch (error) {
      console.error('Failed to get request:', error);
      // Try cache
      return await duaStorage.getCachedRequestById(id);
    }
  }, []);

  const syncPending = useCallback(async () => {
    await duaSync.forceSync();
    await refreshRequests();
  }, [refreshRequests]);

  return (
    <DuaContext.Provider
      value={{
        state,
        submitRequest,
        refreshRequests,
        getRequestById,
        syncPending,
      }}
    >
      {children}
    </DuaContext.Provider>
  );
}

export function useDua() {
  const context = useContext(DuaContext);
  if (!context) {
    throw new Error('useDua must be used within a DuaProvider');
  }
  return context;
}
