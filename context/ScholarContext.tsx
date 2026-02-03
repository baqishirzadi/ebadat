/**
 * Scholar Context
 * Global state management for scholar authentication and data
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { Scholar } from '@/types/articles';
import * as scholarAuth from '@/utils/scholarAuth';
import * as scholarService from '@/utils/scholarService';

interface ScholarState {
  isAuthenticated: boolean;
  scholar: Scholar | null;
  isLoading: boolean;
  error: string | null;
}

type ScholarAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_SCHOLAR'; payload: Scholar | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGOUT' };

function scholarReducer(state: ScholarState, action: ScholarAction): ScholarState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    case 'SET_SCHOLAR':
      return { ...state, scholar: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        scholar: null,
        error: null,
      };
    default:
      return state;
  }
}

const initialState: ScholarState = {
  isAuthenticated: false,
  scholar: null,
  isLoading: true,
  error: null,
};

interface ScholarContextType {
  state: ScholarState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const ScholarContext = createContext<ScholarContextType | undefined>(undefined);

export function ScholarProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(scholarReducer, initialState);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const session = await scholarAuth.getScholarSession();
      
      if (session) {
        const scholar = await scholarService.getScholarById(session.uid);
        if (scholar) {
          dispatch({ type: 'SET_SCHOLAR', payload: scholar });
          dispatch({ type: 'SET_AUTHENTICATED', payload: true });
        } else {
          dispatch({ type: 'SET_AUTHENTICATED', payload: false });
        }
      } else {
        dispatch({ type: 'SET_AUTHENTICATED', payload: false });
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      dispatch({ type: 'SET_AUTHENTICATED', payload: false });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const session = await scholarAuth.loginScholar(email, password);
      const scholar = await scholarService.getScholarById(session.uid);
      
      if (!scholar) {
        throw new Error('Scholar profile not found');
      }

      dispatch({ type: 'SET_SCHOLAR', payload: scholar });
      dispatch({ type: 'SET_AUTHENTICATED', payload: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطا در ورود';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await scholarAuth.logoutScholar();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }, []);

  return (
    <ScholarContext.Provider
      value={{
        state,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </ScholarContext.Provider>
  );
}

export function useScholar() {
  const context = useContext(ScholarContext);
  if (!context) {
    throw new Error('useScholar must be used within ScholarProvider');
  }
  return context;
}
