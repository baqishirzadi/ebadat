/**
 * Edit Article Screen
 * Edit existing article
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useScholar } from '@/context/ScholarContext';
import { ArticleCategory, ArticleLanguage, ARTICLE_CATEGORIES } from '@/types/articles';
import { getArticleById, updateArticle, deleteArticle } from '@/utils/articleService';
import { notifyArticlePublished } from '@/utils/articleNotifications';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import CenteredText from '@/components/CenteredText';

export default function EditArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useApp();
  const { state: scholarState } = useScholar();
  const router = useRouter();
  const [article, setArticle] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<ArticleCategory>('iman');
  const [language, setLanguage] = useState<ArticleLanguage>('dari');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadArticle();
  }, [id]);

  async function loadArticle() {
    try {
      setLoading(true);
      const loadedArticle = await getArticleById(id);
      if (loadedArticle) {
        setArticle(loadedArticle);
        setTitle(loadedArticle.title);
        setBody(loadedArticle.body);
        setCategory(loadedArticle.category);
        setLanguage(loadedArticle.language);
      }
    } catch (error) {
      Alert.alert('خطا', 'خطا در بارگذاری مقاله');
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('خطا', 'لطفاً عنوان و متن مقاله را وارد کنید');
      return;
    }

    try {
      setSaving(true);
      await updateArticle(id, {
        title: title.trim(),
        body: body.trim(),
        category,
        language,
      });
      Alert.alert('موفق', 'مقاله به‌روزرسانی شد');
      router.back();
    } catch (error) {
      Alert.alert('خطا', 'خطا در به‌روزرسانی مقاله');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('خطا', 'لطفاً عنوان و متن مقاله را وارد کنید');
      return;
    }

    try {
      setPublishing(true);
      await updateArticle(id, {
        title: title.trim(),
        body: body.trim(),
        category,
        language,
        published: true,
      });

      if (!article?.notificationSent && scholarState.scholar) {
        const notificationResult = await notifyArticlePublished(
          id,
          scholarState.scholar.fullName,
          title.trim()
        );
        if (notificationResult.success) {
          Alert.alert('موفق', `مقاله منتشر شد. ${notificationResult.sentCount} اعلان ارسال شد.`);
        }
      } else {
        Alert.alert('موفق', 'مقاله منتشر شد');
      }

      router.replace('/scholar/dashboard');
    } catch (error) {
      Alert.alert('خطا', 'خطا در انتشار مقاله');
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'حذف مقاله',
      'آیا مطمئن هستید که می‌خواهید این مقاله را حذف کنید؟',
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteArticle(id);
              Alert.alert('موفق', 'مقاله حذف شد');
              router.replace('/scholar/dashboard');
            } catch (error) {
              Alert.alert('خطا', 'خطا در حذف مقاله');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      </View>
    );
  }

  if (!article) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <CenteredText style={[styles.errorText, { color: theme.text }]}>
          مقاله یافت نشد
        </CenteredText>
      </View>
    );
  }

  const categories = Object.values(ARTICLE_CATEGORIES);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Category Selection */}
        <View style={styles.section}>
          <CenteredText style={[styles.label, { color: theme.text }]}>دسته‌بندی</CenteredText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                style={({ pressed }) => [
                  styles.categoryButton,
                  {
                    backgroundColor: category === cat.id ? theme.tint : theme.card,
                    borderColor: category === cat.id ? theme.tint : theme.cardBorder,
                  },
                  pressed && styles.buttonPressed,
                ]}
              >
                <MaterialIcons
                  name={cat.icon as any}
                  size={16}
                  color={category === cat.id ? '#fff' : cat.color}
                />
                <CenteredText
                  style={[
                    styles.categoryText,
                    { color: category === cat.id ? '#fff' : theme.text },
                  ]}
                >
                  {cat.nameDari}
                </CenteredText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Language Selection */}
        <View style={styles.section}>
          <CenteredText style={[styles.label, { color: theme.text }]}>زبان</CenteredText>
          <View style={styles.languageRow}>
            <Pressable
              onPress={() => setLanguage('dari')}
              style={({ pressed }) => [
                styles.languageButton,
                {
                  backgroundColor: language === 'dari' ? theme.tint : theme.card,
                  borderColor: language === 'dari' ? theme.tint : theme.cardBorder,
                },
                pressed && styles.buttonPressed,
              ]}
            >
              <CenteredText
                style={[
                  styles.languageText,
                  { color: language === 'dari' ? '#fff' : theme.text },
                ]}
              >
                دری
              </CenteredText>
            </Pressable>
            <Pressable
              onPress={() => setLanguage('pashto')}
              style={({ pressed }) => [
                styles.languageButton,
                {
                  backgroundColor: language === 'pashto' ? theme.tint : theme.card,
                  borderColor: language === 'pashto' ? theme.tint : theme.cardBorder,
                },
                pressed && styles.buttonPressed,
              ]}
            >
              <CenteredText
                style={[
                  styles.languageText,
                  { color: language === 'pashto' ? '#fff' : theme.text },
                ]}
              >
                پښتو
              </CenteredText>
            </Pressable>
          </View>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <CenteredText style={[styles.label, { color: theme.text }]}>عنوان</CenteredText>
          <TextInput
            style={[
              styles.titleInput,
              { backgroundColor: theme.card, borderColor: theme.cardBorder, color: theme.text },
            ]}
            placeholder="عنوان مقاله را وارد کنید"
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={setTitle}
            textAlign="right"
            multiline
          />
        </View>

        {/* Body */}
        <View style={styles.section}>
          <CenteredText style={[styles.label, { color: theme.text }]}>متن مقاله</CenteredText>
          <TextInput
            style={[
              styles.bodyInput,
              { backgroundColor: theme.card, borderColor: theme.cardBorder, color: theme.text },
            ]}
            placeholder="متن مقاله را بنویسید..."
            placeholderTextColor={theme.textSecondary}
            value={body}
            onChangeText={setBody}
            textAlign="right"
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Status */}
        {article.published && (
          <View style={[styles.statusCard, { backgroundColor: `${theme.tint}20`, borderColor: theme.tint }]}>
            <MaterialIcons name="check-circle" size={20} color={theme.tint} />
            <CenteredText style={[styles.statusText, { color: theme.tint }]}>
              این مقاله منتشر شده است
            </CenteredText>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={handleSave}
            disabled={saving || publishing}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: saving ? theme.cardBorder : theme.card,
                borderColor: theme.cardBorder,
              },
              pressed && styles.buttonPressed,
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <>
                <MaterialIcons name="save" size={20} color={theme.text} />
                <CenteredText style={[styles.buttonText, { color: theme.text }]}>
                  ذخیره
                </CenteredText>
              </>
            )}
          </Pressable>

          {!article.published && (
            <Pressable
              onPress={handlePublish}
              disabled={saving || publishing}
              style={({ pressed }) => [
                styles.publishButton,
                {
                  backgroundColor: publishing ? theme.cardBorder : theme.tint,
                },
                pressed && styles.buttonPressed,
              ]}
            >
              {publishing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="publish" size={20} color="#fff" />
                  <CenteredText style={styles.publishButtonText}>انتشار</CenteredText>
                </>
              )}
            </Pressable>
          )}

          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              {
                backgroundColor: theme.card,
                borderColor: '#F44336',
              },
              pressed && styles.buttonPressed,
            ]}
          >
            <MaterialIcons name="delete" size={20} color="#F44336" />
            <CenteredText style={[styles.buttonText, { color: '#F44336' }]}>
              حذف
            </CenteredText>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Vazirmatn',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    fontFamily: 'Vazirmatn',
  },
  categories: {
    marginTop: Spacing.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  languageRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  languageButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  languageText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  titleInput: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  bodyInput: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    fontSize: 16,
    fontFamily: 'Vazirmatn',
    minHeight: 300,
    textAlignVertical: 'top',
    lineHeight: 28,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  actions: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Vazirmatn',
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
