# Islamic Scholars Articles System

## Overview

A production-grade scholarly publishing platform where 7 trusted Afghan scholars can publish articles directly to users without admin approval. The system is offline-first, optimized for low-end Android devices, and culturally tailored for Afghan users.

## Architecture

### Data Flow

```
Scholar → Firebase Auth → Scholar Dashboard → Article Editor → Publish
                                                                    ↓
User ← Push Notification ← Firebase Firestore ← Article Published
  ↓
Articles Tab → Article Reader → Analytics Tracking
```

### Key Components

1. **Types** (`types/articles.ts`, `types/analytics.ts`)
   - Article, Scholar, Category types
   - Analytics types

2. **Services** (`utils/`)
   - `articleService.ts` - CRUD operations for articles
   - `scholarService.ts` - Scholar data management
   - `scholarAuth.ts` - Scholar authentication
   - `articleStorage.ts` - Offline caching
   - `analyticsService.ts` - Analytics tracking
   - `articleNotifications.ts` - Push notifications
   - `scholarAnalytics.ts` - Scholar statistics
   - `syncService.ts` - Background sync

3. **Context** (`context/`)
   - `ArticlesContext.tsx` - Articles state management
   - `ScholarContext.tsx` - Scholar authentication state

4. **UI Components** (`components/articles/`)
   - `ArticleCard.tsx` - Article list item
   - `ArticleReader.tsx` - Reading view
   - `ScholarCarousel.tsx` - Featured scholars
   - `CategoryFilter.tsx` - Category/language filter
   - `BookmarkButton.tsx` - Floating bookmark
   - `ShareButton.tsx` - Share functionality

5. **Screens** (`app/`)
   - `(tabs)/articles.tsx` - Articles tab
   - `articles/index.tsx` - Articles feed
   - `articles/[id].tsx` - Article reader
   - `scholar/login.tsx` - Scholar login
   - `scholar/dashboard.tsx` - Scholar dashboard
   - `scholar/article/new.tsx` - Create article
   - `scholar/article/[id].tsx` - Edit article
   - `scholar/analytics.tsx` - Analytics view

## Firebase Collections

### `scholars`
- Document ID: Firebase Auth UID
- Fields: fullName, bio, photoUrl, verified, role, createdAt

### `articles`
- Document ID: auto-generated
- Fields: title, language, authorId, authorName, category, body, audioUrl, published, publishedAt, createdAt, updatedAt, readingTimeEstimate, viewCount, bookmarkCount, draft, notificationSent

### `article_analytics`
- Document ID: articleId
- Fields: views, uniqueReaders, readingCompletion, bookmarks, shares, lastViewedAt

## Fixed Scholars

1. Mufti Fayz Muhammad Usmani
2. Mufti Abdul Salam Abid
3. Mufti Fazlullah Noori
4. Mawlana Sayyid Muhammad Shirzadi
5. Mawlana Fazlur Rahman Ansari
6. Sayyid Abdul Ilah Shirzadi
7. Sayyid Abdullah Shirzadi

## Features

### For Scholars
- Direct publishing (no approval needed)
- Auto-save drafts
- Article analytics dashboard
- Edit/delete own articles
- Push notification on publish

### For Users
- Articles feed with category filter
- Language toggle (Dari/Pashto)
- Featured scholars carousel
- Immersive reading experience
- Bookmark articles
- Share articles
- Offline reading
- Reading progress tracking

## Offline Support

- Articles cached locally (last 100)
- Scholars cached locally
- Bookmarks stored locally
- Reading progress tracked locally
- Background sync when online

## Analytics

Tracks:
- Article views
- Unique readers
- Reading completion percentage
- Bookmarks
- Shares

## Notifications

When a scholar publishes:
1. Article becomes live immediately
2. Push notification sent to all users
3. Deep link to article
4. Scholar sees confirmation in dashboard

## Design Principles

- Calm, dignified, spiritual
- Minimal, clean interface
- Large, readable typography
- Soft colors, ample whitespace
- RTL support (Dari/Pashto)
- No comments or public discussions
- Privacy-focused (anonymous users)

## Next Steps

1. Set up Firebase Auth accounts for 7 scholars
2. Create scholar documents in Firestore
3. Configure Firebase Cloud Messaging for push notifications
4. Test publishing flow
5. Test offline functionality
6. Optimize for low-end devices
