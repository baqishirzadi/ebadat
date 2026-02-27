import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArticleReader } from '@/components/articles/ArticleReader';
import {
  ArticleComposer,
  ArticleComposerPayload,
  ArticleComposerInitialValue,
} from '@/components/articles/ArticleComposer';
import CenteredText from '@/components/CenteredText';
import { useApp } from '@/context/AppContext';
import { useArticles } from '@/context/ArticlesContext';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { Article } from '@/types/articles';
import {
  clearAdminSession,
  createArticleByAdmin,
  deleteArticleByAdmin,
  isAdminSessionActive,
  listArticles,
  publishArticleByAdmin,
  updateArticleByAdmin,
} from '@/utils/articleAdminService';
import { calculateReadingTime } from '@/utils/articleService';

function buildPreviewArticle(preview: Partial<ArticleComposerPayload> | null): Article | null {
  if (!preview?.title || !preview?.body || !preview?.authorId || !preview?.authorName) {
    return null;
  }

  return {
    id: 'preview-article',
    title: preview.title,
    body: preview.body,
    category: preview.category || 'iman',
    language: preview.language || 'dari',
    authorId: preview.authorId,
    authorName: preview.authorName,
    published: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    readingTimeEstimate: calculateReadingTime(preview.body),
    viewCount: 0,
    bookmarkCount: 0,
    notificationSent: false,
  };
}

export default function ArticleAdminScreen() {
  const { theme } = useApp();
  const { state, refreshArticles, refreshScholars } = useArticles();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composerVisible, setComposerVisible] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [previewDraft, setPreviewDraft] = useState<Partial<ArticleComposerPayload> | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const loadArticles = useCallback(async () => {
    try {
      const data = await listArticles();
      setArticles(data);
    } catch {
      Alert.alert('خطا', 'دریافت فهرست مقالات ممکن نشد.');
    }
  }, []);

  const bootstrap = useCallback(async () => {
    if (!isAdminSessionActive()) {
      router.replace('/articles');
      return;
    }

    setLoading(true);
    try {
      await Promise.all([loadArticles(), refreshScholars()]);
    } finally {
      setLoading(false);
    }
  }, [loadArticles, refreshScholars, router]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && !isAdminSessionActive()) {
        clearAdminSession();
        router.replace('/articles');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadArticles();
    setRefreshing(false);
  };

  const handleLogout = () => {
    clearAdminSession();
    router.replace('/articles');
  };

  const openComposerForCreate = () => {
    setEditingArticle(null);
    setPreviewDraft(null);
    setShowPreview(false);
    setComposerVisible(true);
  };

  const openComposerForEdit = (article: Article) => {
    setEditingArticle(article);
    setPreviewDraft({
      authorId: article.authorId,
      authorName: article.authorName,
      title: article.title,
      body: article.body,
      category: article.category,
      language: article.language,
    });
    setShowPreview(false);
    setComposerVisible(true);
  };

  const closeComposer = () => {
    setComposerVisible(false);
    setEditingArticle(null);
    setPreviewDraft(null);
    setShowPreview(false);
  };

  const afterMutation = async () => {
    await Promise.all([loadArticles(), refreshArticles()]);
  };

  const handleSaveDraft = async (payload: ArticleComposerPayload) => {
    try {
      if (editingArticle) {
        await updateArticleByAdmin(editingArticle.id, payload);
      } else {
        await createArticleByAdmin({ ...payload, published: false });
      }

      await afterMutation();
      Alert.alert('موفق', 'پیش‌نویس ذخیره شد.');
      closeComposer();
    } catch {
      Alert.alert('خطا', 'ذخیره پیش‌نویس ناموفق بود.');
    }
  };

  const handlePublish = async (payload: ArticleComposerPayload) => {
    try {
      let articleId = editingArticle?.id || '';

      if (editingArticle) {
        await updateArticleByAdmin(editingArticle.id, payload);
      } else {
        const created = await createArticleByAdmin({ ...payload, published: false });
        articleId = created.id;
      }

      if (!articleId) {
        throw new Error('MISSING_ARTICLE_ID');
      }

      const result = await publishArticleByAdmin(articleId);
      await afterMutation();

      const summary = result.skipped
        ? 'این مقاله قبلاً منتشر و اعلان آن ارسال شده است.'
        : `انتشار انجام شد. ارسال موفق: ${result.sent} • ناموفق: ${result.failed}`;

      Alert.alert('انتشار', summary);
      closeComposer();
    } catch {
      Alert.alert('خطا', 'انتشار مقاله ناموفق بود.');
    }
  };

  const handleDelete = (article: Article) => {
    Alert.alert('حذف مقاله', 'این مقاله حذف شود؟', [
      { text: 'انصراف', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteArticleByAdmin(article.id);
            await afterMutation();
          } catch {
            Alert.alert('خطا', 'حذف مقاله ناموفق بود.');
          }
        },
      },
    ]);
  };

  const handlePublishExisting = (article: Article) => {
    Alert.alert('انتشار مقاله', 'این مقاله منتشر شود؟', [
      { text: 'انصراف', style: 'cancel' },
      {
        text: 'انتشار',
        onPress: async () => {
          try {
            const result = await publishArticleByAdmin(article.id);
            await afterMutation();
            const summary = result.skipped
              ? 'این مقاله قبلاً منتشر و اعلان آن ارسال شده است.'
              : `انتشار انجام شد. ارسال موفق: ${result.sent} • ناموفق: ${result.failed}`;
            Alert.alert('انتشار', summary);
          } catch {
            Alert.alert('خطا', 'انتشار مقاله ناموفق بود.');
          }
        },
      },
    ]);
  };

  const drafts = useMemo(() => articles.filter((item) => !item.published), [articles]);
  const published = useMemo(() => articles.filter((item) => item.published), [articles]);

  const previewArticle = useMemo(() => buildPreviewArticle(previewDraft), [previewDraft]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  const composerInitial: ArticleComposerInitialValue | null = editingArticle
    ? {
        id: editingArticle.id,
        authorId: editingArticle.authorId,
        authorName: editingArticle.authorName,
        title: editingArticle.title,
        body: editingArticle.body,
        category: editingArticle.category,
        language: editingArticle.language,
      }
    : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <View style={[styles.header, { backgroundColor: theme.surahHeader, paddingTop: insets.top + Spacing.sm }]}> 
        <Pressable onPress={() => router.back()} style={styles.headerIconButton}>
          <MaterialIcons name="arrow-forward" size={22} color="#fff" />
        </Pressable>
        <CenteredText style={styles.headerTitle}>مدیریت مقالات</CenteredText>
        <Pressable onPress={handleLogout} style={styles.headerIconButton}>
          <MaterialIcons name="logout" size={22} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.tint}
            colors={[theme.tint]}
          />
        }
      >
        <View style={styles.topActions}>
          <Pressable
            onPress={openComposerForCreate}
            style={[styles.primaryAction, { backgroundColor: theme.tint }]}
          >
            <MaterialIcons name="add" size={18} color="#fff" />
            <CenteredText style={styles.primaryActionText}>مقاله جدید</CenteredText>
          </Pressable>

          <Pressable
            onPress={handleRefresh}
            style={[styles.secondaryAction, { borderColor: theme.cardBorder, backgroundColor: theme.card }]}
          >
            <MaterialIcons name="refresh" size={18} color={theme.text} />
            <CenteredText style={[styles.secondaryActionText, { color: theme.text }]}>بازبینی</CenteredText>
          </Pressable>
        </View>

        {composerVisible && (
          <View style={styles.composerBlock}>
            <ArticleComposer
              scholars={state.scholars}
              initialValue={composerInitial}
              onSaveDraft={handleSaveDraft}
              onPublish={handlePublish}
              onCancel={closeComposer}
              onPreviewArticleChange={setPreviewDraft}
            />

            <Pressable
              onPress={() => setShowPreview((prev) => !prev)}
              style={[styles.previewToggle, { borderColor: theme.cardBorder, backgroundColor: theme.card }]}
            >
              <MaterialIcons name={showPreview ? 'visibility-off' : 'visibility'} size={18} color={theme.text} />
              <CenteredText style={[styles.previewToggleText, { color: theme.text }]}>
                {showPreview ? 'بستن پیش‌نمایش' : 'نمایش پیش‌نمایش'}
              </CenteredText>
            </Pressable>

            {showPreview && previewArticle && (
              <View style={[styles.previewCard, { borderColor: theme.cardBorder, backgroundColor: theme.card }]}> 
                <CenteredText style={[styles.previewTitle, { color: theme.text }]}>پیش‌نمایش مقاله</CenteredText>
                <ArticleReader article={previewArticle} />
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <CenteredText style={[styles.sectionTitle, { color: theme.text }]}>پیش‌نویس‌ها ({drafts.length})</CenteredText>
          {drafts.length === 0 ? (
            <View style={[styles.emptyCard, { borderColor: theme.cardBorder, backgroundColor: theme.card }]}> 
              <CenteredText style={[styles.emptyText, { color: theme.textSecondary }]}>پیش‌نویسی موجود نیست.</CenteredText>
            </View>
          ) : (
            drafts.map((article) => (
              <View key={article.id} style={[styles.itemCard, { borderColor: theme.cardBorder, backgroundColor: theme.card }]}> 
                <CenteredText style={[styles.itemTitle, { color: theme.text }]} numberOfLines={2}>
                  {article.title}
                </CenteredText>
                <CenteredText style={[styles.itemMeta, { color: theme.textSecondary }]}>
                  {article.authorName}
                </CenteredText>
                <View style={styles.itemActions}>
                  <Pressable
                    onPress={() => openComposerForEdit(article)}
                    style={[styles.itemActionButton, { borderColor: theme.cardBorder }]}
                  >
                    <MaterialIcons name="edit" size={16} color={theme.text} />
                    <CenteredText style={[styles.itemActionText, { color: theme.text }]}>ویرایش</CenteredText>
                  </Pressable>
                  <Pressable
                    onPress={() => handlePublishExisting(article)}
                    style={[styles.itemActionButton, { borderColor: theme.tint, backgroundColor: `${theme.tint}15` }]}
                  >
                    <MaterialIcons name="publish" size={16} color={theme.tint} />
                    <CenteredText style={[styles.itemActionText, { color: theme.tint }]}>انتشار</CenteredText>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(article)}
                    style={[styles.itemActionButton, { borderColor: '#F44336', backgroundColor: '#F4433615' }]}
                  >
                    <MaterialIcons name="delete" size={16} color="#F44336" />
                    <CenteredText style={[styles.itemActionText, { color: '#F44336' }]}>حذف</CenteredText>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <CenteredText style={[styles.sectionTitle, { color: theme.text }]}>منتشر شده‌ها ({published.length})</CenteredText>
          {published.length === 0 ? (
            <View style={[styles.emptyCard, { borderColor: theme.cardBorder, backgroundColor: theme.card }]}> 
              <CenteredText style={[styles.emptyText, { color: theme.textSecondary }]}>مقاله منتشر شده‌ای موجود نیست.</CenteredText>
            </View>
          ) : (
            published.map((article) => (
              <View key={article.id} style={[styles.itemCard, { borderColor: theme.cardBorder, backgroundColor: theme.card }]}> 
                <CenteredText style={[styles.itemTitle, { color: theme.text }]} numberOfLines={2}>
                  {article.title}
                </CenteredText>
                <CenteredText style={[styles.itemMeta, { color: theme.textSecondary }]}>
                  {article.authorName}
                </CenteredText>
                <View style={styles.itemActions}>
                  <Pressable
                    onPress={() => openComposerForEdit(article)}
                    style={[styles.itemActionButton, { borderColor: theme.cardBorder }]}
                  >
                    <MaterialIcons name="edit" size={16} color={theme.text} />
                    <CenteredText style={[styles.itemActionText, { color: theme.text }]}>ویرایش</CenteredText>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push(`/articles/${article.id}`)}
                    style={[styles.itemActionButton, { borderColor: theme.cardBorder }]}
                  >
                    <MaterialIcons name="open-in-new" size={16} color={theme.text} />
                    <CenteredText style={[styles.itemActionText, { color: theme.text }]}>نمایش</CenteredText>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(article)}
                    style={[styles.itemActionButton, { borderColor: '#F44336', backgroundColor: '#F4433615' }]}
                  >
                    <MaterialIcons name="delete" size={16} color="#F44336" />
                    <CenteredText style={[styles.itemActionText, { color: '#F44336' }]}>حذف</CenteredText>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontFamily: 'Vazirmatn',
    fontWeight: '700',
    fontSize: Typography.ui.subtitle,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  topActions: {
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
  },
  primaryAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  primaryActionText: {
    color: '#fff',
    fontFamily: 'Vazirmatn',
    fontWeight: '700',
    fontSize: Typography.ui.caption,
  },
  secondaryAction: {
    minWidth: 116,
    borderWidth: 1,
    minHeight: 44,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  secondaryActionText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    fontWeight: '600',
  },
  composerBlock: {
    gap: Spacing.sm,
  },
  previewToggle: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minHeight: 42,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  previewToggleText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    fontWeight: '600',
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  previewTitle: {
    fontFamily: 'Vazirmatn',
    fontWeight: '700',
    fontSize: Typography.ui.body,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: 'Vazirmatn',
    fontWeight: '700',
    fontSize: Typography.ui.subtitle,
    textAlign: 'right',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  emptyText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    textAlign: 'center',
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  itemTitle: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  itemMeta: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  itemActions: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  itemActionButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    minHeight: 34,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  itemActionText: {
    fontFamily: 'Vazirmatn',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
