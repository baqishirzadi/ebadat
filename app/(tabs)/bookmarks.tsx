/**
 * Bookmarks Screen
 * Displays user's saved ayah bookmarks
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp, useBookmarks } from '@/context/AppContext';
import { useQuranData } from '@/hooks/useQuranData';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Bookmark } from '@/types/quran';
import CenteredText from '@/components/CenteredText';

// Arabic number conversion
const toArabicNumber = (num: number): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
};

// Format date
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('fa-AF', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function BookmarksScreen() {
  const { theme } = useApp();
  const { bookmarks, removeBookmark } = useBookmarks();
  const { getSurah, getAyah } = useQuranData();
  const router = useRouter();

  const handleBookmarkPress = useCallback(
    (bookmark: Bookmark) => {
      router.push(`/quran/${bookmark.surahNumber}?ayah=${bookmark.ayahNumber}`);
    },
    [router]
  );

  const handleDeleteBookmark = useCallback(
    (bookmark: Bookmark) => {
      const surah = getSurah(bookmark.surahNumber);
      Alert.alert(
        'حذف نشانه',
        `آیا می‌خواهید نشانه سوره ${surah?.name || ''} آیه ${toArabicNumber(bookmark.ayahNumber)} را حذف کنید؟`,
        [
          { text: 'لغو', style: 'cancel' },
          {
            text: 'حذف',
            style: 'destructive',
            onPress: () => removeBookmark(bookmark.id),
          },
        ]
      );
    },
    [getSurah, removeBookmark]
  );

  const renderBookmark = useCallback(
    ({ item }: { item: Bookmark }) => {
      const surah = getSurah(item.surahNumber);
      const ayah = getAyah(item.surahNumber, item.ayahNumber);

      if (!surah || !ayah) return null;

      return (
        <Pressable
          onPress={() => handleBookmarkPress(item)}
          onLongPress={() => handleDeleteBookmark(item)}
          style={({ pressed }) => [
            styles.bookmarkItem,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
            pressed && styles.bookmarkItemPressed,
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: `${theme.bookmark}20` }]}>
            <MaterialIcons name="bookmark" size={28} color={theme.bookmark} />
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.headerRow}>
              <CenteredText style={[styles.surahName, { color: theme.text }]}>{surah.name}</CenteredText>
              <CenteredText style={[styles.ayahNumber, { color: theme.ayahNumber }]}>
                آیه {toArabicNumber(item.ayahNumber)}
              </CenteredText>
            </View>

            <CenteredText
              style={[styles.ayahPreview, { color: theme.arabicText }]}
              numberOfLines={2}
            >
              {ayah.text}
            </CenteredText>

            <View style={styles.footerRow}>
              <CenteredText style={[styles.dateText, { color: theme.textSecondary }]}>
                {formatDate(item.timestamp)}
              </CenteredText>
              <CenteredText style={[styles.pageText, { color: theme.textSecondary }]}>
                صفحه {toArabicNumber(item.page)}
              </CenteredText>
            </View>
          </View>

          <Pressable
            onPress={() => handleDeleteBookmark(item)}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.deleteButtonPressed,
            ]}
          >
            <MaterialIcons name="delete-outline" size={22} color={theme.icon} />
          </Pressable>
        </Pressable>
      );
    },
    [theme, getSurah, getAyah, handleBookmarkPress, handleDeleteBookmark]
  );

  const sortedBookmarks = [...bookmarks].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
        <MaterialIcons name="bookmark" size={36} color="#fff" />
        <CenteredText style={styles.headerTitle}>نشانه‌ها</CenteredText>
        <CenteredText style={styles.headerSubtitle}>
          {bookmarks.length > 0
            ? `${toArabicNumber(bookmarks.length)} نشانه ذخیره شده`
            : 'هیچ نشانه‌ای ذخیره نشده'}
        </CenteredText>
      </View>

      {bookmarks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="bookmark-border" size={80} color={theme.textSecondary} />
          <CenteredText style={[styles.emptyTitle, { color: theme.text }]}>
            هیچ نشانه‌ای ندارید
          </CenteredText>
          <CenteredText style={[styles.emptyText, { color: theme.textSecondary }]}>
            آیات مورد علاقه خود را نشانه‌گذاری کنید تا بعداً به آنها دسترسی داشته باشید
          </CenteredText>
        </View>
      ) : (
        <FlatList
          data={sortedBookmarks}
          keyExtractor={(item) => item.id}
          renderItem={renderBookmark}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: Spacing.sm,
  },
  headerSubtitle: {
    fontSize: Typography.ui.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.xs,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  separator: {
    height: Spacing.sm,
  },
  bookmarkItem: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  bookmarkItemPressed: {
    opacity: 0.9,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  surahName: {
    fontSize: Typography.ui.subtitle,
    fontWeight: '600',
    fontFamily: 'serif',
  },
  ayahNumber: {
    fontSize: Typography.ui.caption,
    fontWeight: '600',
  },
  ayahPreview: {
    fontSize: Typography.arabic.small,
lineHeight: 32,
    fontFamily: 'serif',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  dateText: {
    fontSize: Typography.ui.caption,
  },
  pageText: {
    fontSize: Typography.ui.caption,
  },
  deleteButton: {
    padding: Spacing.sm,
    alignSelf: 'flex-start',
  },
  deleteButtonPressed: {
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.ui.title,
    fontWeight: '600',
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: Typography.ui.body,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 24,
  },
});
