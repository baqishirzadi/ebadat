import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import CenteredText from '@/components/CenteredText';
import { BorderRadius, Spacing, Typography, type ThemeColors } from '@/constants/theme';
import { JUZ_RANGES } from '@/data/juzRanges';
import audioManager, { RECITERS, type ReciterKey } from '@/utils/quranAudio';
import {
  downloadQuranScope,
  deleteQuranScope,
  getDownloadManifest,
  getDownloadManifestKey,
  getJuzDownloadScope,
  getSurahDownloadScope,
  type QuranDownloadProgress,
} from '@/utils/quranDownloadService';

type Props = {
  surahNumber: number;
  ayahCount: number;
  theme: ThemeColors;
  onSettingsPress?: () => void;
};

export function QuranDownloadCard({ surahNumber, ayahCount, theme, onSettingsPress }: Props) {
  const [reciter, setReciter] = useState<ReciterKey>(() => audioManager.getReciter());
  const [showReciters, setShowReciters] = useState(false);
  const [showJuz, setShowJuz] = useState(false);
  const [activeScope, setActiveScope] = useState<'surah' | 'juz' | null>(null);
  const [progress, setProgress] = useState<QuranDownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  const [completedScope, setCompletedScope] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void getDownloadManifest().then((entries) => {
      const surahKey = getDownloadManifestKey(reciter, { type: 'surah', id: surahNumber });
      const entry = entries.find((item) => item.key === surahKey && item.completed === item.total);
      if (mounted && entry) {
        setProgress(entry);
        setCompletedScope(entry.key);
      }
    });
    return () => { mounted = false; };
  }, [reciter, surahNumber]);

  const relevantJuz = useMemo(
    () => JUZ_RANGES.filter((range) => surahNumber >= range.startSurah && surahNumber <= range.endSurah),
    [surahNumber],
  );

  const startDownload = async (scope: Parameters<typeof downloadQuranScope>[0]) => {
    if (controller) return;
    const nextController = new AbortController();
    setController(nextController);
    setActiveScope(scope.type);
    setError(null);
    try {
      const result = await downloadQuranScope(scope, reciter, setProgress, nextController.signal);
      setCompletedScope(result.key);
    } catch (downloadError) {
      if (!(downloadError instanceof Error && downloadError.message === 'download_cancelled')) {
        setError('دانلود کامل نشد. اینترنت و فضای ذخیره‌سازی را بررسی کنید.');
      }
    } finally {
      setController(null);
      setActiveScope(null);
    }
  };

  const selectedName = RECITERS[reciter].name;
  const surahDownloadKey = getDownloadManifestKey(reciter, { type: 'surah', id: surahNumber });
  const isCurrent = progress?.reciter === reciter && (progress.scopeType === activeScope || progress.key === completedScope);
  const progressLabel = completedScope && isCurrent && progress?.completed === progress?.total
    ? 'دانلود شد'
    : isCurrent && progress
    ? `${progress.completed} / ${progress.total}`
    : 'آماده دانلود';

  return (
    <View style={[styles.card, { backgroundColor: `${theme.surahHeaderText}12`, borderColor: `${theme.surahHeaderText}30` }]}>
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <CenteredText style={[styles.title, { color: theme.surahHeaderText }]}>دانلود تلاوت</CenteredText>
          <CenteredText style={[styles.subtitle, { color: `${theme.surahHeaderText}cc` }]}>{selectedName}</CenteredText>
        </View>
        {onSettingsPress ? (
          <Pressable testID="quran-reader-settings-shortcut" onPress={onSettingsPress} style={styles.iconButton}>
            <MaterialIcons name="tune" size={20} color={theme.surahHeaderText} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.actionRow}>
        <Pressable testID="quran-reciter-picker" onPress={() => setShowReciters(true)} style={[styles.selector, { borderColor: `${theme.surahHeaderText}45` }]}>
          <MaterialIcons name="record-voice-over" size={17} color={theme.surahHeaderText} />
          <CenteredText style={[styles.selectorText, { color: theme.surahHeaderText }]}>قاری</CenteredText>
        </Pressable>
        <Pressable testID="quran-download-surah" disabled={Boolean(controller)} onPress={() => void startDownload(getSurahDownloadScope(surahNumber, ayahCount))} style={[styles.downloadButton, { backgroundColor: theme.surahHeaderText }]}>
          {activeScope === 'surah' ? <ActivityIndicator size="small" color={theme.surahHeader} /> : <MaterialIcons name="download" size={17} color={theme.surahHeader} />}
          <CenteredText style={[styles.downloadText, { color: theme.surahHeader }]}>کل سوره</CenteredText>
        </Pressable>
        <Pressable testID="quran-download-juz" disabled={Boolean(controller)} onPress={() => setShowJuz(true)} style={[styles.downloadButton, { backgroundColor: `${theme.surahHeaderText}28` }]}>
          <MaterialIcons name="library-music" size={17} color={theme.surahHeaderText} />
          <CenteredText style={[styles.downloadText, { color: theme.surahHeaderText }]}>جزء</CenteredText>
        </Pressable>
      </View>

      <View style={styles.statusRow}>
        <CenteredText style={[styles.status, { color: `${theme.surahHeaderText}cc` }]}>{progressLabel}</CenteredText>
        {controller ? <Pressable testID="quran-download-cancel" onPress={() => controller.abort()}><CenteredText style={[styles.cancel, { color: theme.surahHeaderText }]}>لغو</CenteredText></Pressable> : null}
        {!controller && completedScope === surahDownloadKey ? <Pressable testID="quran-download-delete" onPress={() => { void deleteQuranScope(getSurahDownloadScope(surahNumber, ayahCount), reciter).then(() => { setCompletedScope(null); setProgress(null); }); }}><CenteredText style={[styles.cancel, { color: theme.surahHeaderText }]}>حذف</CenteredText></Pressable> : null}
      </View>
      {error ? <CenteredText style={[styles.error, { color: theme.surahHeaderText }]}>{error}</CenteredText> : null}

      <Modal visible={showReciters} transparent animationType="fade" onRequestClose={() => setShowReciters(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowReciters(false)}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <CenteredText style={[styles.modalTitle, { color: theme.text }]}>انتخاب قاری</CenteredText>
            {Object.values(RECITERS).map((item) => (
              <Pressable key={item.key} testID={`quran-reciter-${item.key}`} onPress={() => { setReciter(item.key); void audioManager.setReciter(item.key); setShowReciters(false); }} style={[styles.modalOption, { borderBottomColor: theme.divider }]}>
                <CenteredText style={[styles.modalOptionText, { color: item.key === reciter ? theme.tint : theme.text }]}>{item.name}</CenteredText>
                {item.key === reciter ? <MaterialIcons name="check" size={20} color={theme.tint} /> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showJuz} transparent animationType="fade" onRequestClose={() => setShowJuz(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowJuz(false)}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, maxHeight: '75%' }]}>
            <CenteredText style={[styles.modalTitle, { color: theme.text }]}>انتخاب جزء</CenteredText>
            <ScrollView>
              {JUZ_RANGES.map((item) => (
                <Pressable key={item.juzNumber} testID={`quran-juz-${item.juzNumber}`} onPress={() => { setShowJuz(false); void startDownload(getJuzDownloadScope(item.juzNumber)); }} style={[styles.modalOption, { borderBottomColor: theme.divider, opacity: relevantJuz.some((juz) => juz.juzNumber === item.juzNumber) ? 1 : 0.65 }]}>
                  <CenteredText style={[styles.modalOptionText, { color: theme.text }]}>جزء {item.juzNumber}</CenteredText>
                  <MaterialIcons name="download" size={18} color={theme.tint} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: Spacing.md, padding: Spacing.sm, borderRadius: BorderRadius.lg, borderWidth: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleText: { flex: 1, alignItems: 'flex-end' },
  title: { fontFamily: 'Vazirmatn', fontSize: Typography.ui.body, fontWeight: '700' },
  subtitle: { fontFamily: 'Vazirmatn', fontSize: Typography.ui.caption, marginTop: 2 },
  iconButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  selector: { flex: 1, minHeight: 38, borderWidth: 1, borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  selectorText: { fontFamily: 'Vazirmatn', fontSize: Typography.ui.caption },
  downloadButton: { flex: 1.35, minHeight: 38, borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  downloadText: { fontFamily: 'Vazirmatn', fontSize: Typography.ui.caption, fontWeight: '700' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  status: { flex: 1, textAlign: 'right', fontFamily: 'Vazirmatn', fontSize: 11 },
  cancel: { fontFamily: 'Vazirmatn', fontSize: 11, textDecorationLine: 'underline' },
  error: { fontFamily: 'Vazirmatn', fontSize: 11, marginTop: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { borderRadius: BorderRadius.lg, padding: Spacing.md },
  modalTitle: { fontFamily: 'Vazirmatn', fontSize: Typography.ui.subtitle, fontWeight: '700', marginBottom: Spacing.sm },
  modalOption: { minHeight: 46, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalOptionText: { flex: 1, textAlign: 'right', fontFamily: 'Vazirmatn', fontSize: Typography.ui.body },
});
