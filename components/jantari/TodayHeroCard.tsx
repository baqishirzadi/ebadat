import React, { memo } from 'react';

import { TodayDateCard } from '@/components/home/TodayDateCard';

function TodayHeroCardInner() {
  return <TodayDateCard />;
}

export const TodayHeroCard = memo(TodayHeroCardInner);
