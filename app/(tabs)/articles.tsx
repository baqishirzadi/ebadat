/**
 * Articles Tab Screen
 * Main articles feed with scholars carousel and latest articles
 */

import React, { useEffect } from 'react';
import ArticlesFeed from '../articles/index';
import { ensureArticlePushRegistrationOnFirstOpen } from '@/utils/articlePushRegistry';

export default function ArticlesTabScreen() {
  useEffect(() => {
    console.log('[ArticlesTab] Component mounted - Articles tab is loading');
    void ensureArticlePushRegistrationOnFirstOpen();
  }, []);

  return <ArticlesFeed />;
}
