import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import CenteredText from '@/components/CenteredText';
import { BorderRadius, Spacing, Typography, type ThemeColors } from '@/constants/theme';
import audioManager, { RECITERS, type ReciterKey } from '@/utils/quranAudio';
import {
  downloadQuranScope,
  getDownloadManifest,
  getDownloadManifestKey,
  getPreferredDownloadReciter,
  getSavedDownloadReciter,
  setPreferredDownloadReciter,
  type QuranDownloadProgress,
  type QuranDownloadScope,
} from '@/utils/quranDownloadService';

type Props = {
  visible: boolean;
  scope: QuranDownloadScope;
  theme: ThemeColors;
  title: string;
  primaryLabel: string;
  onClose: () => void;
  onCompleted?: (reciter: ReciterKey) => void;
};

export function QuranDownloadCard({
  visible,
  scope,
  theme,
  title,
  primaryLabel,
  onClose,
  onCompleted,
}: Props) {
  const [reciter, setReciter] = useState<ReciterKey>(() => audioManager.getReciter());
  const [hasSavedReciter, setHasSavedReciter] = useState(false);
  const [showReciters, setShowReciters] = useState(true);
  const [progress, setProgress] = useState<QuranDownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  const [completedKeys, setCompletedKeys] = useState<string[]>([]);

  const downloadKey = useMemo(() => getDownloadManifestKey(reciter, scope), [reciter, scope]);
  const isComplete = completedKeys.includes(downloadKey);
  const isDownloading = Boolean(controller);
  const canDownload = !isDownloading && !isComplete;

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    void Promise.all([
      getPreferredDownloadReciter(audioManager.getReciter()),
      getSavedDownloadReciter(),
      getDownloadManifest(),
    ]).then(([preferred, saved, entries]) => {
      if (!mounted) return;
      setReciter(preferred);
      setHasSavedReciter(Boolean(saved));
      setShowReciters(!saved);
      setCompletedKeys(
        entries
          .filter((entry) => entry.completed === entry.total && entry.total > 0)
          .map((entry) => entry.key)
      );
      const existing = entries.find((entry) => entry.key === getDownloadManifestKey(preferred, scope));
      setProgress(existing ?? null);
      setError(null);
    });
    return () => {
      mounted = false;
    };
  }, [scope, visible]);

  const startDownload = async (nextReciter = reciter) => {
    if (controller) return;
    const nextController = new AbortController();
    setController(nextController);
    setError(null);
    setProgress(null);
    try {
      await setPreferredDownloadReciter(nextReciter);
      setHasSavedReciter(true);
      setShowReciters(false);
      setReciter(nextReciter);
      const result = await downloadQuranScope(scope, nextReciter, setProgress, nextController.signal);
      // Keep playback aligned with the files just downloaded. Otherwise the
      // player may select a different reciter and require a network URL when
      // the user immediately plays while offline.
      await audioManager.setReciter(nextReciter);
      setCompletedKeys((current) => current.includes(result.key) ? current : [...current, result.key]);
      onCompleted?.(nextReciter);
    } catch (downloadError) {
      if (!(downloadError instanceof Error && downloadError.message === 'download_cancelled')) {
        setError('دانلود کامل نشد. اینترنت و فضای ذخیره‌سازی را بررسی کنید.');
      }
    } finally {
      setController(null);
    }
  };

  const selectedName = RECITERS[reciter].name;
  const progressLabel = isComplete
    ? 'دانلود شد'
    : progress
      ? `${progress.completed} / ${progress.total}`
      : hasSavedReciter
        ? 'آماده دانلود'
        : 'قاری را انتخاب کنید';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.card }]} onPress={(event) => event.stopPropagation()}>
          <View style={styles.headerRow}>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
              <MaterialIcons name="close" size={22} color={theme.icon} />
            </Pressable>
            <View style={styles.titleBlock}>
              <CenteredText style={[styles.title, { color: theme.text }]}>{title}</CenteredText>
              <CenteredText style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {selectedName}
              </CenteredText>
            </View>
            <View style={styles.closeButton} />
          </View>

          {showReciters ? (
            <ScrollView style={styles.reciterList} contentContainerStyle={styles.reciterListContent}>
              {Object.values(RECITERS).map((item) => (
                <Pressable
                  key={item.key}
                  testID={`quran-download-reciter-${item.key}`}
                  onPress={() => void startDownload(item.key)}
                  disabled={isDownloading}
                  style={[
                    styles.reciterOption,
                    { borderColor: theme.divider, backgroundColor: item.key === reciter ? theme.backgroundSecondary : theme.card },
                  ]}
                >
                  <CenteredText style={[styles.reciterOptionName, { color: item.key === reciter ? theme.tint : theme.text }]}>
                    {item.name}
                  </CenteredText>
                  <CenteredText style={[styles.reciterQuality, { color: theme.textSecondary }]}>
                    {item.quality}
                  </CenteredText>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <>
              <Pressable
                testID={`quran-download-${scope.type}`}
                disabled={!canDownload}
                onPress={() => void startDownload()}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: isComplete ? `${theme.tint}24` : theme.tint,
                    opacity: isDownloading ? 0.82 : 1,
                  },
                ]}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name={isComplete ? 'check-circle' : 'download'} size={19} color={isComplete ? theme.tint : '#fff'} />
                )}
                <CenteredText style={[styles.primaryButtonText, { color: isComplete ? theme.tint : '#fff' }]}>
                  {isComplete ? 'دانلود شد' : primaryLabel}
                </CenteredText>
              </Pressable>

              <View style={styles.statusRow}>
                <CenteredText style={[styles.statusText, { color: theme.textSecondary }]}>
                  {progressLabel}
                </CenteredText>
                {isDownloading ? (
                  <Pressable testID="quran-download-cancel" onPress={() => controller?.abort()} hitSlop={8}>
                    <CenteredText style={[styles.linkText, { color: theme.tint }]}>لغو</CenteredText>
                  </Pressable>
                ) : (
                  <Pressable testID="quran-download-change-reciter" onPress={() => setShowReciters(true)} hitSlop={8}>
                    <CenteredText style={[styles.linkText, { color: theme.tint }]}>تغییر قاری</CenteredText>
                  </Pressable>
                )}
              </View>
              {error ? <CenteredText style={[styles.error, { color: '#DC2626' }]}>{error}</CenteredText> : null}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    maxHeight: '78%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.subtitle,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  subtitle: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 2,
  },
  reciterList: {
    maxHeight: 360,
  },
  reciterListContent: {
    gap: Spacing.xs,
  },
  reciterOption: {
    minHeight: 54,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  reciterOptionName: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  reciterQuality: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 2,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  primaryButtonText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.body,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  statusRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  statusText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  linkText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  error: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: Spacing.xs,
  },
});
