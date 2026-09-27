/**
 * Quran Tab — Surah list
 */

import React from 'react';
import { SurahList } from '@/components/quran';
import { usePortraitLock } from '@/hooks/usePortraitLock';

export default function QuranTabScreen() {
  usePortraitLock();
  return <SurahList />;
}
