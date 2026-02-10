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
import { NaatDraft } from '@/types/naat';

export default function NaatAdminScreen() {
  const { theme } = useApp();
  const router = useRouter();
  const { naats, createItem, updateItem, removeItem } = useNaat();

  const [titleFa, setTitleFa] = useState('');
  const [titlePs, setTitlePs] = useState('');
  const [reciterName, setReciterName] = useState('');
  const [description, setDescription] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [fileSizeMb, setFileSizeMb] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!titleFa.trim() || !titlePs.trim() || !reciterName.trim() || !audioUrl.trim()) {
      Alert.alert('خطا', 'تمام فیلدها ضروری است');
      return;
    }
    if (!audioUrl.includes('supabase') || !audioUrl.includes('/storage/')) {
      Alert.alert('خطا', 'لینک باید از Supabase Storage باشد');
      return;
    }
    try {
      const payload: NaatDraft = {
        title_fa: titleFa,
        title_ps: titlePs,
        reciter_name: reciterName,
        description: description.trim() || undefined,
        audio_url: audioUrl,
        duration_seconds: durationSeconds ? Number(durationSeconds) : null,
        file_size_mb: fileSizeMb ? Number(fileSizeMb) : null,
      };
      if (editingId) {
        await updateItem(editingId, payload);
      } else {
        await createItem(payload);
      }
      setTitleFa('');
      setTitlePs('');
      setReciterName('');
      setDescription('');
      setAudioUrl('');
      setDurationSeconds('');
      setFileSizeMb('');
      setEditingId(null);
      Alert.alert('موفق', editingId ? 'نعت به‌روزرسانی شد' : 'نعت اضافه شد');
    } catch (error) {
      console.error('Failed to save naat:', error);
      const message = (error as Error)?.message || '';
      if (message.includes('supabase-not-configured')) {
        Alert.alert('خطا', 'اتصال به سرور تنظیم نشده است');
        return;
      }
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
          <Text style={[styles.noteText, { color: theme.textSecondary }]}>
            فقط لینک مستقیم فایل صوتی از Supabase Storage را وارد کنید
          </Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.cardBorder }]}
            placeholder="عنوان نعت (دری)"
            placeholderTextColor={theme.textSecondary}
            value={titleFa}
            onChangeText={setTitleFa}
            textAlign="right"
          />
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.cardBorder }]}
            placeholder="عنوان نعت (پښتو)"
            placeholderTextColor={theme.textSecondary}
            value={titlePs}
            onChangeText={setTitlePs}
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
            placeholder="توضیحات (اختیاری)"
            placeholderTextColor={theme.textSecondary}
            value={description}
            onChangeText={setDescription}
            textAlign="right"
          />
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.cardBorder }]}
            placeholder="لینک صوتی مستقیم (Supabase Storage)"
            placeholderTextColor={theme.textSecondary}
            value={audioUrl}
            onChangeText={setAudioUrl}
            textAlign="right"
          />
          <View style={styles.metaRow}>
            <TextInput
              style={[styles.metaInput, { color: theme.text, borderColor: theme.cardBorder }]}
              placeholder="مدت (ثانیه)"
              placeholderTextColor={theme.textSecondary}
              value={durationSeconds}
              onChangeText={setDurationSeconds}
              keyboardType="numeric"
              textAlign="center"
            />
            <TextInput
              style={[styles.metaInput, { color: theme.text, borderColor: theme.cardBorder }]}
              placeholder="حجم (MB)"
              placeholderTextColor={theme.textSecondary}
              value={fileSizeMb}
              onChangeText={setFileSizeMb}
              keyboardType="numeric"
              textAlign="center"
            />
          </View>

          <Pressable onPress={handleAdd} style={[styles.addButton, { backgroundColor: theme.tint }]}>
            <MaterialIcons name={editingId ? 'save' : 'add'} size={20} color="#fff" />
            <Text style={styles.addButtonText}>{editingId ? 'ذخیره تغییرات' : 'افزودن نعت'}</Text>
          </Pressable>
          {editingId && (
            <Pressable
              onPress={() => {
                setEditingId(null);
                setTitleFa('');
                setTitlePs('');
                setReciterName('');
                setDescription('');
                setAudioUrl('');
                setDurationSeconds('');
                setFileSizeMb('');
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
              setTitleFa(naat.title_fa);
              setTitlePs(naat.title_ps);
              setReciterName(naat.reciter_name);
              setDescription(naat.description || '');
              setAudioUrl(naat.audio_url);
              setDurationSeconds(naat.duration_seconds ? String(naat.duration_seconds) : '');
              setFileSizeMb(naat.file_size_mb ? String(naat.file_size_mb) : '');
            }}
            style={[styles.row, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
              {naat.title_fa}
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
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
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
  noteText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontFamily: 'Vazirmatn',
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metaInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontFamily: 'Vazirmatn',
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
