/**
 * Local Admin - Na't Management
 * Hardcoded admin mode (no auth for now)
 */

import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, ScrollView, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useNaat } from '@/context/NaatContext';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { NaatLanguage } from '@/types/naat';

export default function NaatAdminScreen() {
  const { theme } = useApp();
  const router = useRouter();
  const { naats, addItem, editItem, removeItem } = useNaat();

  const [title, setTitle] = useState('');
  const [reciterName, setReciterName] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [language, setLanguage] = useState<NaatLanguage>('fa');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!title.trim() || !reciterName.trim() || !youtubeUrl.trim()) {
      Alert.alert('خطا', 'تمام فیلدها ضروری است');
      return;
    }
    try {
      if (editingId) {
        await editItem(editingId, {
          title,
          reciterName,
          youtubeUrl,
          language,
          extractedAudioUrl: audioUrl.trim() || undefined,
        });
      } else {
        await addItem({ title, reciterName, youtubeUrl, language, extractedAudioUrl: audioUrl.trim() || undefined });
      }
      setTitle('');
      setReciterName('');
      setYoutubeUrl('');
      setAudioUrl('');
      setLanguage('fa');
      setEditingId(null);
      Alert.alert('موفق', editingId ? 'نعت به‌روزرسانی شد' : 'نعت اضافه شد');
    } catch (error) {
      console.error('Failed to save naat:', error);
      Alert.alert('خطا', 'ثبت نعت موفق نبود. دوباره تلاش کنید.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surahHeader }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-forward" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>مدیریت نعت‌ها</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.cardBorder }]}
            placeholder="عنوان نعت"
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={setTitle}
            textAlign="right"
          />
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.cardBorder }]}
            placeholder="نام قاری/منشد"
            placeholderTextColor={theme.textSecondary}
            value={reciterName}
            onChangeText={setReciterName}
            textAlign="right"
          />
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.cardBorder }]}
            placeholder="لینک یوتیوب"
            placeholderTextColor={theme.textSecondary}
            value={youtubeUrl}
            onChangeText={setYoutubeUrl}
            textAlign="right"
          />
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.cardBorder }]}
            placeholder="لینک صوتی مستقیم (اختیاری)"
            placeholderTextColor={theme.textSecondary}
            value={audioUrl}
            onChangeText={setAudioUrl}
            textAlign="right"
          />

          <View style={styles.languageRow}>
            {([
              { key: 'fa', label: 'دری' },
              { key: 'ps', label: 'پښتو' },
              { key: 'ar', label: 'عربی' },
            ] as const).map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setLanguage(item.key)}
                style={[
                  styles.langButton,
                  {
                    backgroundColor: language === item.key ? theme.tint : theme.backgroundSecondary,
                    borderColor: theme.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.langButtonText, { color: language === item.key ? '#fff' : theme.text }]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={handleAdd} style={[styles.addButton, { backgroundColor: theme.tint }]}>
            <MaterialIcons name={editingId ? 'save' : 'add'} size={20} color="#fff" />
            <Text style={styles.addButtonText}>{editingId ? 'ذخیره تغییرات' : 'افزودن نعت'}</Text>
          </Pressable>
          {editingId && (
            <Pressable
              onPress={() => {
                setEditingId(null);
                setTitle('');
                setReciterName('');
                setYoutubeUrl('');
                setAudioUrl('');
                setLanguage('fa');
              }}
              style={[styles.cancelButton, { borderColor: theme.cardBorder }]}
            >
              <Text style={[styles.cancelText, { color: theme.textSecondary }]}>لغو</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: theme.text }]}>همه نعت‌ها</Text>
        </View>

        {naats.map((naat) => (
          <Pressable
            key={naat.id}
            onPress={() => {
              setEditingId(naat.id);
              setTitle(naat.title);
              setReciterName(naat.reciterName);
              setYoutubeUrl(naat.youtubeUrl);
              setAudioUrl(naat.extractedAudioUrl || '');
              setLanguage(naat.language);
            }}
            style={[styles.row, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
              {naat.title}
            </Text>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                removeItem(naat.id);
              }}
              style={styles.deleteButton}
            >
              <MaterialIcons name="delete" size={20} color="#d32f2f" />
            </Pressable>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 56,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.subtitle,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontFamily: 'Vazirmatn',
    marginBottom: Spacing.sm,
  },
  languageRow: {
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  langButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  langButtonText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
  },
  addButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  addButtonText: {
    color: '#fff',
    fontFamily: 'Vazirmatn',
  },
  cancelButton: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'Vazirmatn',
  },
  listHeader: {
    marginBottom: Spacing.sm,
  },
  listTitle: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.subtitle,
  },
  row: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: {
    flex: 1,
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
});
