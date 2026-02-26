import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ArticleCategory, ArticleLanguage, ARTICLE_CATEGORIES, Scholar } from '@/types/articles';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import {
  applyHeadingTag,
  applyInlineTag,
  applyParagraphTag,
  EditorSelection,
  normalizeSelection,
  sanitizeArticleHtml,
} from '@/utils/articleHtml';

export interface ArticleComposerPayload {
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  category: ArticleCategory;
  language: ArticleLanguage;
}

export interface ArticleComposerInitialValue extends Partial<ArticleComposerPayload> {
  id?: string;
}

interface ArticleComposerProps {
  scholars: Scholar[];
  initialValue?: ArticleComposerInitialValue | null;
  onSaveDraft: (payload: ArticleComposerPayload) => Promise<void>;
  onPublish: (payload: ArticleComposerPayload) => Promise<void>;
  onCancel: () => void;
  onPreviewArticleChange?: (payload: Partial<ArticleComposerPayload>) => void;
  disabled?: boolean;
}

function normalizeScholars(scholars: Scholar[]): Scholar[] {
  const seen = new Set<string>();
  return scholars.filter((scholar) => {
    const key = scholar.id.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildDefaultSelection(text: string): EditorSelection {
  const cursor = text.length;
  return { start: cursor, end: cursor };
}

export function ArticleComposer({
  scholars,
  initialValue,
  onSaveDraft,
  onPublish,
  onCancel,
  onPreviewArticleChange,
  disabled = false,
}: ArticleComposerProps) {
  const { theme } = useApp();
  const normalizedScholars = useMemo(() => normalizeScholars(scholars), [scholars]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<ArticleCategory>('iman');
  const [language, setLanguage] = useState<ArticleLanguage>('dari');
  const [selectedAuthorId, setSelectedAuthorId] = useState('');
  const [selection, setSelection] = useState<EditorSelection>({ start: 0, end: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const categories = useMemo(() => Object.values(ARTICLE_CATEGORIES), []);

  useEffect(() => {
    const defaultScholar = normalizedScholars[0];
    const selectedFromInitial = initialValue?.authorId || defaultScholar?.id || '';

    setSelectedAuthorId(selectedFromInitial);
    setTitle(initialValue?.title || '');
    setBody(initialValue?.body || '');
    setCategory(initialValue?.category || 'iman');
    setLanguage(initialValue?.language || 'dari');
    setSelection(buildDefaultSelection(initialValue?.body || ''));
  }, [initialValue, normalizedScholars]);

  const selectedAuthor = useMemo(() => {
    const byId = normalizedScholars.find((item) => item.id === selectedAuthorId);
    if (byId) return byId;

    if (initialValue?.authorId && initialValue?.authorName && initialValue.authorId === selectedAuthorId) {
      return {
        id: initialValue.authorId,
        fullName: initialValue.authorName,
        email: '',
        bio: '',
        verified: true,
        role: 'scholar' as const,
        createdAt: new Date(),
      };
    }

    return null;
  }, [initialValue?.authorId, initialValue?.authorName, normalizedScholars, selectedAuthorId]);

  useEffect(() => {
    onPreviewArticleChange?.({
      authorId: selectedAuthor?.id,
      authorName: selectedAuthor?.fullName,
      title,
      body: sanitizeArticleHtml(body),
      category,
      language,
    });
  }, [body, category, language, onPreviewArticleChange, selectedAuthor?.fullName, selectedAuthor?.id, title]);

  const handleSelectionChange = (
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>
  ) => {
    setSelection(event.nativeEvent.selection);
  };

  const mutateBody = (result: { text: string; selection: EditorSelection }) => {
    setBody(result.text);
    setSelection(normalizeSelection(result.text, result.selection));
  };

  const applyFormat = (type: 'h2' | 'mark' | 'strong' | 'em' | 'p') => {
    const safeSelection = normalizeSelection(body, selection);

    if (type === 'h2') {
      mutateBody(applyHeadingTag(body, safeSelection));
      return;
    }

    if (type === 'p') {
      mutateBody(applyParagraphTag(body, safeSelection));
      return;
    }

    mutateBody(applyInlineTag(body, safeSelection, type));
  };

  const buildPayload = (): ArticleComposerPayload | null => {
    if (!selectedAuthor || !selectedAuthor.id) {
      Alert.alert('خطا', 'لطفاً نویسنده را انتخاب کنید.');
      return null;
    }

    const normalizedTitle = title.trim();
    const normalizedBody = sanitizeArticleHtml(body);

    if (!normalizedTitle || !normalizedBody) {
      Alert.alert('خطا', 'عنوان و متن مقاله ضروری است.');
      return null;
    }

    return {
      authorId: selectedAuthor.id,
      authorName: selectedAuthor.fullName,
      title: normalizedTitle,
      body: normalizedBody,
      category,
      language,
    };
  };

  const handleSaveDraft = async () => {
    const payload = buildPayload();
    if (!payload) return;

    try {
      setIsSaving(true);
      await onSaveDraft(payload);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    const payload = buildPayload();
    if (!payload) return;

    try {
      setIsPublishing(true);
      await onPublish(payload);
    } finally {
      setIsPublishing(false);
    }
  };

  const busy = disabled || isSaving || isPublishing;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}> 
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.text }]}>نویسنده</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {normalizedScholars.map((scholar) => {
            const selected = selectedAuthorId === scholar.id;
            return (
              <Pressable
                key={scholar.id}
                onPress={() => setSelectedAuthorId(scholar.id)}
                disabled={busy}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? theme.tint : theme.backgroundSecondary,
                    borderColor: selected ? theme.tint : theme.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: selected ? '#fff' : theme.text }]} numberOfLines={1}>
                  {scholar.fullName}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.text }]}>زبان</Text>
        <View style={styles.languageRow}>
          <Pressable
            onPress={() => setLanguage('dari')}
            disabled={busy}
            style={[
              styles.languageButton,
              {
                backgroundColor: language === 'dari' ? theme.tint : theme.backgroundSecondary,
                borderColor: language === 'dari' ? theme.tint : theme.cardBorder,
              },
            ]}
          >
            <Text style={[styles.languageText, { color: language === 'dari' ? '#fff' : theme.text }]}>دری</Text>
          </Pressable>
          <Pressable
            onPress={() => setLanguage('pashto')}
            disabled={busy}
            style={[
              styles.languageButton,
              {
                backgroundColor: language === 'pashto' ? theme.tint : theme.backgroundSecondary,
                borderColor: language === 'pashto' ? theme.tint : theme.cardBorder,
              },
            ]}
          >
            <Text style={[styles.languageText, { color: language === 'pashto' ? '#fff' : theme.text }]}>پښتو</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.text }]}>دسته‌بندی</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {categories.map((item) => {
            const selected = category === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setCategory(item.id)}
                disabled={busy}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: selected ? theme.tint : theme.backgroundSecondary,
                    borderColor: selected ? theme.tint : theme.cardBorder,
                  },
                ]}
              >
                <MaterialIcons name={item.icon as never} size={14} color={selected ? '#fff' : item.color} />
                <Text style={[styles.categoryText, { color: selected ? '#fff' : theme.text }]}>
                  {item.nameDari}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.text }]}>عنوان</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          editable={!busy}
          placeholder="عنوان مقاله"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.cardBorder,
              color: theme.text,
            },
          ]}
          textAlign="right"
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.text }]}>ابزار نگارش</Text>
        <View style={styles.toolbar}>
          <Pressable
            onPress={() => applyFormat('h2')}
            disabled={busy}
            style={[styles.toolButton, { borderColor: theme.cardBorder, backgroundColor: theme.backgroundSecondary }]}
          >
            <Text style={[styles.toolButtonText, { color: theme.text }]}>H2</Text>
          </Pressable>
          <Pressable
            onPress={() => applyFormat('mark')}
            disabled={busy}
            style={[styles.toolButton, { borderColor: theme.cardBorder, backgroundColor: theme.backgroundSecondary }]}
          >
            <Text style={[styles.toolButtonText, { color: theme.text }]}>هایلایت</Text>
          </Pressable>
          <Pressable
            onPress={() => applyFormat('strong')}
            disabled={busy}
            style={[styles.toolButton, { borderColor: theme.cardBorder, backgroundColor: theme.backgroundSecondary }]}
          >
            <Text style={[styles.toolButtonText, { color: theme.text }]}>Bold</Text>
          </Pressable>
          <Pressable
            onPress={() => applyFormat('em')}
            disabled={busy}
            style={[styles.toolButton, { borderColor: theme.cardBorder, backgroundColor: theme.backgroundSecondary }]}
          >
            <Text style={[styles.toolButtonText, { color: theme.text }]}>Em</Text>
          </Pressable>
          <Pressable
            onPress={() => applyFormat('p')}
            disabled={busy}
            style={[styles.toolButton, { borderColor: theme.cardBorder, backgroundColor: theme.backgroundSecondary }]}
          >
            <Text style={[styles.toolButtonText, { color: theme.text }]}>P</Text>
          </Pressable>
        </View>

        <TextInput
          value={body}
          onChangeText={setBody}
          onSelectionChange={handleSelectionChange}
          selection={selection}
          editable={!busy}
          placeholder="متن مقاله را وارد کنید..."
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.bodyInput,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.cardBorder,
              color: theme.text,
            },
          ]}
          textAlign="right"
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={onCancel}
          disabled={busy}
          style={[styles.actionSecondary, { borderColor: theme.cardBorder, backgroundColor: theme.backgroundSecondary }]}
        >
          <Text style={[styles.actionSecondaryText, { color: theme.text }]}>بستن</Text>
        </Pressable>

        <Pressable
          onPress={handleSaveDraft}
          disabled={busy}
          style={[styles.actionSecondary, { borderColor: theme.cardBorder, backgroundColor: theme.backgroundSecondary }]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : (
            <Text style={[styles.actionSecondaryText, { color: theme.text }]}>ذخیره پیش‌نویس</Text>
          )}
        </Pressable>

        <Pressable
          onPress={handlePublish}
          disabled={busy}
          style={[styles.actionPrimary, { backgroundColor: theme.tint }]}
        >
          {isPublishing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.actionPrimaryText}>انتشار</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.sm,
  },
  label: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    fontWeight: '700',
    textAlign: 'right',
  },
  chipRow: {
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 34,
    justifyContent: 'center',
    maxWidth: 220,
  },
  chipText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
  },
  categoryChip: {
    flexDirection: 'row-reverse',
    gap: Spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 34,
  },
  categoryText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
  languageRow: {
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
  },
  languageButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minHeight: 46,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
  },
  toolbar: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  toolButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minHeight: 34,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolButtonText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    fontWeight: '600',
  },
  bodyInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minHeight: 220,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    lineHeight: 26,
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
  },
  actionPrimary: {
    flex: 1.2,
    borderRadius: BorderRadius.md,
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionPrimaryText: {
    color: '#fff',
    fontFamily: 'Vazirmatn',
    fontWeight: '700',
    fontSize: Typography.ui.caption,
  },
  actionSecondary: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  actionSecondaryText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    fontWeight: '600',
    textAlign: 'center',
  },
});
