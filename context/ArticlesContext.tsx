/**
 * Articles Context
 * Global state management for articles
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { Article, Scholar } from '@/types/articles';
import * as articleService from '@/utils/articleService';
import * as articleStorage from '@/utils/articleStorage';
import * as scholarService from '@/utils/scholarService';
import * as syncService from '@/utils/syncService';
import NetInfo from '@react-native-community/netinfo';

interface ArticlesState {
  articles: Article[];
  scholars: Scholar[];
  bookmarks: string[];
  isLoading: boolean;
  isOffline: boolean;
  error: string | null;
  lastSync: number | null;
}

type ArticlesAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ARTICLES'; payload: Article[] }
  | { type: 'ADD_ARTICLE'; payload: Article }
  | { type: 'UPDATE_ARTICLE'; payload: Article }
  | { type: 'SET_SCHOLARS'; payload: Scholar[] }
  | { type: 'SET_BOOKMARKS'; payload: string[] }
  | { type: 'ADD_BOOKMARK'; payload: string }
  | { type: 'REMOVE_BOOKMARK'; payload: string }
  | { type: 'SET_OFFLINE'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LAST_SYNC'; payload: number | null };

function articlesReducer(state: ArticlesState, action: ArticlesAction): ArticlesState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ARTICLES':
      return { ...state, articles: action.payload };
    case 'ADD_ARTICLE':
      return { ...state, articles: [action.payload, ...state.articles] };
    case 'UPDATE_ARTICLE':
      return {
        ...state,
        articles: state.articles.map((a) =>
          a.id === action.payload.id ? action.payload : a
        ),
      };
    case 'SET_SCHOLARS':
      return { ...state, scholars: action.payload };
    case 'SET_BOOKMARKS':
      return { ...state, bookmarks: action.payload };
    case 'ADD_BOOKMARK':
      return {
        ...state,
        bookmarks: state.bookmarks.includes(action.payload)
          ? state.bookmarks
          : [...state.bookmarks, action.payload],
      };
    case 'REMOVE_BOOKMARK':
      return {
        ...state,
        bookmarks: state.bookmarks.filter((id) => id !== action.payload),
      };
    case 'SET_OFFLINE':
      return { ...state, isOffline: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_LAST_SYNC':
      return { ...state, lastSync: action.payload };
    default:
      return state;
  }
}

const initialState: ArticlesState = {
  articles: [],
  scholars: [],
  bookmarks: [],
  isLoading: true,
  isOffline: false,
  error: null,
  lastSync: null,
};

interface ArticlesContextType {
  state: ArticlesState;
  refreshArticles: () => Promise<void>;
  refreshScholars: () => Promise<void>;
  syncArticles: () => Promise<void>;
  toggleBookmark: (articleId: string) => Promise<void>;
  isBookmarked: (articleId: string) => boolean;
}

const ArticlesContext = createContext<ArticlesContextType | undefined>(undefined);

export function ArticlesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(articlesReducer, initialState);

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      dispatch({ type: 'SET_OFFLINE', payload: !state.isConnected });
    });

    return () => unsubscribe();
  }, []);

  // Initialize
  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Load bookmarks
      const bookmarks = await articleStorage.getBookmarks();
      dispatch({ type: 'SET_BOOKMARKS', payload: bookmarks });

      // Load last sync
      const lastSync = await articleStorage.getLastSyncTimestamp();
      dispatch({ type: 'SET_LAST_SYNC', payload: lastSync });

      // Load cached data first (offline support)
      const cachedArticles = await articleStorage.getCachedArticles();
      const cachedScholars = await articleStorage.getCachedScholars();
      
      console.log(`[Articles] Loaded ${cachedArticles.length} cached articles, ${cachedScholars.length} cached scholars`);
      
      dispatch({ type: 'SET_ARTICLES', payload: cachedArticles });
      dispatch({ type: 'SET_SCHOLARS', payload: cachedScholars });

      // Sync if online (this will update articles if available)
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        console.log('[Articles] Online - syncing articles...');
        await syncArticles();
      } else {
        console.log('[Articles] Offline - using cached articles only');
        dispatch({ type: 'SET_OFFLINE', payload: true });
      }
    } catch (error) {
      console.error('Error initializing articles:', error);
      dispatch({ type: 'SET_ERROR', payload: 'خطا در بارگذاری مقالات' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }

  const refreshArticles = useCallback(async () => {
    try {
      console.log('[Articles] Refreshing articles from Firebase...');
      const articles = await articleService.getPublishedArticles({ limitCount: 100 });
      console.log(`[Articles] Loaded ${articles.length} articles from Firebase`);
      dispatch({ type: 'SET_ARTICLES', payload: articles });
      await articleStorage.cacheArticles(articles);
      dispatch({ type: 'SET_LAST_SYNC', payload: Date.now() });
    } catch (error) {
      console.error('Error refreshing articles:', error);
      // Fallback to cache
      const cached = await articleStorage.getCachedArticles();
      console.log(`[Articles] Fallback: Using ${cached.length} cached articles`);
      dispatch({ type: 'SET_ARTICLES', payload: cached });
    }
  }, []);

  const refreshScholars = useCallback(async () => {
    try {
      const scholars = await scholarService.getAllScholars();
      dispatch({ type: 'SET_SCHOLARS', payload: scholars });
      await articleStorage.cacheScholars(scholars);
    } catch (error) {
      console.error('Error refreshing scholars:', error);
      // Fallback to cache
      const cached = await articleStorage.getCachedScholars();
      dispatch({ type: 'SET_SCHOLARS', payload: cached });
    }
  }, []);

  const syncArticles = useCallback(async () => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      dispatch({ type: 'SET_OFFLINE', payload: true });
      return;
    }

    try {
      dispatch({ type: 'SET_OFFLINE', payload: false });
      const result = await syncService.syncAll();
      if (result.success) {
        await Promise.all([refreshArticles(), refreshScholars()]);
      }
    } catch (error) {
      console.error('Error syncing articles:', error);
    }
  }, [refreshArticles, refreshScholars]);

  const toggleBookmark = useCallback(async (articleId: string) => {
    const isBookmarked = state.bookmarks.includes(articleId);
    
    if (isBookmarked) {
      await articleStorage.removeBookmark(articleId);
      dispatch({ type: 'REMOVE_BOOKMARK', payload: articleId });
    } else {
      await articleStorage.addBookmark(articleId);
      dispatch({ type: 'ADD_BOOKMARK', payload: articleId });
    }
  }, [state.bookmarks]);

  const isBookmarked = useCallback(
    (articleId: string) => state.bookmarks.includes(articleId),
    [state.bookmarks]
  );

  return (
    <ArticlesContext.Provider
      value={{
        state,
        refreshArticles,
        refreshScholars,
        syncArticles,
        toggleBookmark,
        isBookmarked,
      }}
    >
      {children}
    </ArticlesContext.Provider>
  );
}

export function useArticles() {
  const context = useContext(ArticlesContext);
  if (!context) {
    throw new Error('useArticles must be used within ArticlesProvider');
  }
  return context;
}
