/**
 * Stats Context
 * Tracks user's Quran reading, dhikr counts, and streaks
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  STATS: '@ebadat/stats',
  DAILY: '@ebadat/daily_stats',
};

// Daily stats
interface DailyStats {
  date: string; // YYYY-MM-DD
  ayahsRead: number;
  ayahsListened: number;
  pagesRead: number;
  dhikrCount: number;
  prayersCompleted: string[]; // ['fajr', 'dhuhr', ...]
  quranMinutes: number;
}

// Overall stats
interface OverallStats {
  totalAyahsRead: number;
  totalAyahsListened: number;
  totalPagesRead: number;
  totalDhikrCount: number;
  totalQuranMinutes: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  khatmCount: number; // Number of Quran completions
  ramadanProgress: number[]; // Array of 30 days progress (0-1)
}

// State
interface StatsState {
  daily: DailyStats;
  overall: OverallStats;
  weeklyAyahs: number[];
  monthlyAyahs: number[];
  isLoading: boolean;
}

// Actions
type StatsAction =
  | { type: 'INITIALIZE'; payload: { daily: DailyStats; overall: OverallStats } }
  | { type: 'UPDATE_DAILY'; payload: Partial<DailyStats> }
  | { type: 'UPDATE_OVERALL'; payload: Partial<OverallStats> }
  | { type: 'ADD_AYAHS_READ'; payload: number }
  | { type: 'ADD_AYAHS_LISTENED'; payload: number }
  | { type: 'ADD_DHIKR'; payload: number }
  | { type: 'ADD_QURAN_MINUTES'; payload: number }
  | { type: 'MARK_PRAYER'; payload: string }
  | { type: 'SET_WEEKLY'; payload: number[] }
  | { type: 'SET_MONTHLY'; payload: number[] }
  | { type: 'SET_LOADING'; payload: boolean };

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

const defaultDaily: DailyStats = {
  date: getToday(),
  ayahsRead: 0,
  ayahsListened: 0,
  pagesRead: 0,
  dhikrCount: 0,
  prayersCompleted: [],
  quranMinutes: 0,
};

const defaultOverall: OverallStats = {
  totalAyahsRead: 0,
  totalAyahsListened: 0,
  totalPagesRead: 0,
  totalDhikrCount: 0,
  totalQuranMinutes: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: '',
  khatmCount: 0,
  ramadanProgress: Array(30).fill(0),
};

// Reducer
function statsReducer(state: StatsState, action: StatsAction): StatsState {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...state,
        daily: action.payload.daily,
        overall: action.payload.overall,
        isLoading: false,
      };
    case 'UPDATE_DAILY':
      return {
        ...state,
        daily: { ...state.daily, ...action.payload },
      };
    case 'UPDATE_OVERALL':
      return {
        ...state,
        overall: { ...state.overall, ...action.payload },
      };
    case 'ADD_AYAHS_READ':
      return {
        ...state,
        daily: { ...state.daily, ayahsRead: state.daily.ayahsRead + action.payload },
        overall: { ...state.overall, totalAyahsRead: state.overall.totalAyahsRead + action.payload },
      };
    case 'ADD_AYAHS_LISTENED':
      return {
        ...state,
        daily: { ...state.daily, ayahsListened: state.daily.ayahsListened + action.payload },
        overall: { ...state.overall, totalAyahsListened: state.overall.totalAyahsListened + action.payload },
      };
    case 'ADD_DHIKR':
      return {
        ...state,
        daily: { ...state.daily, dhikrCount: state.daily.dhikrCount + action.payload },
        overall: { ...state.overall, totalDhikrCount: state.overall.totalDhikrCount + action.payload },
      };
    case 'ADD_QURAN_MINUTES':
      return {
        ...state,
        daily: { ...state.daily, quranMinutes: state.daily.quranMinutes + action.payload },
        overall: { ...state.overall, totalQuranMinutes: state.overall.totalQuranMinutes + action.payload },
      };
    case 'MARK_PRAYER':
      const prayers = state.daily.prayersCompleted.includes(action.payload)
        ? state.daily.prayersCompleted
        : [...state.daily.prayersCompleted, action.payload];
      return {
        ...state,
        daily: { ...state.daily, prayersCompleted: prayers },
      };
    case 'SET_WEEKLY':
      return { ...state, weeklyAyahs: action.payload };
    case 'SET_MONTHLY':
      return { ...state, monthlyAyahs: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// Initial state
const initialState: StatsState = {
  daily: defaultDaily,
  overall: defaultOverall,
  weeklyAyahs: [],
  monthlyAyahs: [],
  isLoading: true,
};

// Context
interface StatsContextType {
  state: StatsState;
  addAyahsRead: (count: number) => void;
  addAyahsListened: (count: number) => void;
  addDhikr: (count: number) => void;
  addQuranMinutes: (minutes: number) => void;
  markPrayerCompleted: (prayer: string) => void;
  incrementKhatm: () => void;
  updateRamadanDay: (day: number, progress: number) => void;
  getWeeklyTotal: () => number;
  getMonthlyTotal: () => number;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

// Provider
export function StatsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(statsReducer, initialState);

  // Load saved data
  useEffect(() => {
    loadStats();
  }, []);

  // Save stats when they change
  useEffect(() => {
    if (!state.isLoading) {
      saveStats();
    }
  }, [state.daily, state.overall, state.isLoading]);

  async function loadStats() {
    try {
      const [dailyJson, overallJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.DAILY),
        AsyncStorage.getItem(STORAGE_KEYS.STATS),
      ]);

      let daily = defaultDaily;
      let overall = overallJson ? JSON.parse(overallJson) : defaultOverall;

      // Check if daily stats are for today
      if (dailyJson) {
        const savedDaily = JSON.parse(dailyJson);
        if (savedDaily.date === getToday()) {
          daily = savedDaily;
        } else {
          // New day - update streak
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          if (savedDaily.date === yesterdayStr && savedDaily.ayahsRead > 0) {
            // Continued streak
            overall.currentStreak += 1;
            if (overall.currentStreak > overall.longestStreak) {
              overall.longestStreak = overall.currentStreak;
            }
          } else if (savedDaily.date !== yesterdayStr) {
            // Streak broken
            overall.currentStreak = 0;
          }
          overall.lastActiveDate = savedDaily.date;
        }
      }

      dispatch({ type: 'INITIALIZE', payload: { daily, overall } });
    } catch (error) {
      console.error('Failed to load stats:', error);
      dispatch({ type: 'INITIALIZE', payload: { daily: defaultDaily, overall: defaultOverall } });
    }
  }

  async function saveStats() {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.DAILY, JSON.stringify(state.daily)),
        AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(state.overall)),
      ]);
    } catch (error) {
      console.error('Failed to save stats:', error);
    }
  }

  const addAyahsRead = useCallback((count: number) => {
    dispatch({ type: 'ADD_AYAHS_READ', payload: count });
  }, []);

  const addAyahsListened = useCallback((count: number) => {
    dispatch({ type: 'ADD_AYAHS_LISTENED', payload: count });
  }, []);

  const addDhikr = useCallback((count: number) => {
    dispatch({ type: 'ADD_DHIKR', payload: count });
  }, []);

  const addQuranMinutes = useCallback((minutes: number) => {
    dispatch({ type: 'ADD_QURAN_MINUTES', payload: minutes });
  }, []);

  const markPrayerCompleted = useCallback((prayer: string) => {
    dispatch({ type: 'MARK_PRAYER', payload: prayer });
  }, []);

  const incrementKhatm = useCallback(() => {
    dispatch({
      type: 'UPDATE_OVERALL',
      payload: { khatmCount: state.overall.khatmCount + 1 },
    });
  }, [state.overall.khatmCount]);

  const updateRamadanDay = useCallback((day: number, progress: number) => {
    const newProgress = [...state.overall.ramadanProgress];
    newProgress[day - 1] = progress;
    dispatch({
      type: 'UPDATE_OVERALL',
      payload: { ramadanProgress: newProgress },
    });
  }, [state.overall.ramadanProgress]);

  const getWeeklyTotal = useCallback(() => {
    return state.weeklyAyahs.reduce((sum, count) => sum + count, 0);
  }, [state.weeklyAyahs]);

  const getMonthlyTotal = useCallback(() => {
    return state.monthlyAyahs.reduce((sum, count) => sum + count, 0);
  }, [state.monthlyAyahs]);

  return (
    <StatsContext.Provider
      value={{
        state,
        addAyahsRead,
        addAyahsListened,
        addDhikr,
        addQuranMinutes,
        markPrayerCompleted,
        incrementKhatm,
        updateRamadanDay,
        getWeeklyTotal,
        getMonthlyTotal,
      }}
    >
      {children}
    </StatsContext.Provider>
  );
}

// Hook
export function useStats() {
  const context = useContext(StatsContext);
  if (!context) {
    throw new Error('useStats must be used within a StatsProvider');
  }
  return context;
}
