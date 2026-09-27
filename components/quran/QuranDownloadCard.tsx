import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import CenteredText from '@/components/CenteredText';
import { BorderRadius, Spacing, Typography, type ThemeColors } from '@/constants/theme';
import { useI18n } from '@/utils/i18n/useI18n';
import { formatNumber } from '@/utils/numbers';
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

export type QuranDownloadScopeChoice = {
  label: string;
  scope: QuranDownloadScope;
};

type Props = {
  visible: boolean;
  scope: QuranDownloadScope;
  /** When more than one choice is passed, the sheet lets the reader pick a scope. */
  scopeChoices?: QuranDownloadScopeChoice[];
  theme: ThemeColors;
  title: string;
  primaryLabel: string;
  onClose: () => void;
  onCompleted?: (reciter: ReciterKey) => void;
};

export function QuranDownloadCard({
  visible,
  scope,
  scopeChoices,
  theme,
  title,
  primaryLabel,
  onClose,
  onCompleted,
}: Props) {
  const { t, language } = useI18n();
  const [reciter, setReciter] = useState<ReciterKey>(() => audioManager.getReciter());
  const [showReciters, setShowReciters] = useState(true);
  const [progress, setProgress] = useState<QuranDownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  const [completedKeys, setCompletedKeys] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const choices = scopeChoices && scopeChoices.length > 0 ? scopeChoices : [{ label: title, scope }];
  const safeIndex = Math.min(selectedIndex, Math.max(choices.length - 1, 0));
  const activeScope = choices[safeIndex]?.scope ?? scope;
  const activeKey = `${activeScope.type}:${activeScope.id}`;
  const activeScopeRef = useRef(activeScope);
  activeScopeRef.current = activeScope;
  const reciterRef = useRef(reciter);
  reciterRef.current = reciter;
  const openedRef = useRef(false);

  const downloadKey = useMemo(
    () => getDownloadManifestKey(reciter, activeScopeRef.current),
    [activeKey, reciter],
  );
  const isComplete = completedKeys.includes(downloadKey);
  const isDownloading = Boolean(controller);
  const canDownload = !isDownloading && !isComplete;

  useEffect(() => {
    if (!visible) {
      openedRef.current = false;
      setSelectedIndex(0);
      return;
    }
    const opening = !openedRef.current;
    openedRef.current = true;
    let mounted = true;
    void Promise.all([
      getPreferredDownloadReciter(audioManager.getReciter()),
      getSavedDownloadReciter(),
      getDownloadManifest(),
    ]).then(([preferred, saved, entries]) => {
      if (!mounted) return;
      const nextReciter = opening ? preferred : reciterRef.current;
      if (opening) {
        setReciter(preferred);
        setShowReciters(!saved);
      }
      setCompletedKeys(
        entries
          .filter((entry) => entry.completed === entry.total && entry.total > 0)
          .map((entry) => entry.key)
      );
      const existing = entries.find((entry) => entry.key === getDownloadManifestKey(nextReciter, activeScopeRef.current));
      setProgress(existing ?? null);
      setError(null);
    });
    return () => {
      mounted = false;
    };
  }, [activeKey, visible]);

  const startDownload = async (nextReciter = reciter) => {
    if (controller) return;
    const nextController = new AbortController();
    setController(nextController);
    setError(null);
    setProgress(null);
    try {
      await setPreferredDownloadReciter(nextReciter);
      setShowReciters(false);
      setReciter(nextReciter);
      const result = await downloadQuranScope(activeScope, nextReciter, setProgress, nextController.signal);
      // Keep playback aligned with the files just downloaded. Otherwise the
      // player may select a different reciter and require a network URL when
      // the user immediately plays while offline.
      await audioManager.setReciter(nextReciter);
      setCompletedKeys((current) => current.includes(result.key) ? current : [...current, result.key]);
      onCompleted?.(nextReciter);
    } catch (downloadError) {
      if (!(downloadError instanceof Error && downloadError.message === 'download_cancelled')) {
        setError(t('quran.download.failed'));
      }
    } finally {
      setController(null);
    }
  };

  const requestClose = () => {
    setSelectedIndex(0);
    onClose();
  };

  const selectedName = RECITERS[reciter].name;
  const progressLabel = isComplete
    ? t('quran.downloaded')
    : progress
      ? t('quran.download.progress', {
          done: formatNumber(progress.completed, language),
          total: formatNumber(progress.total, language),
        })
      : t('quran.download.ready');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={requestClose}>
      <Pressable style={styles.modalBackdrop} onPress={requestClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.card }]} onPress={(event) => event.stopPropagation()}>
          <View style={styles.headerRow}>
            <Pressable onPress={requestClose} hitSlop={8} style={styles.closeButton}>
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

          {choices.length > 1 ? (
            <View style={styles.scopeRow}>
              {choices.map((choice, index) => {
                const selected = index === safeIndex;
                const choiceDone = completedKeys.includes(getDownloadManifestKey(reciter, choice.scope));
                return (
                  <Pressable
                    key={`${choice.scope.type}:${choice.scope.id}`}
                    testID={`quran-download-scope-${choice.scope.type}`}
                    disabled={isDownloading}
                    onPress={() => {
                      setSelectedIndex(index);
                      setProgress(null);
                      setError(null);
                    }}
                    style={[
                      styles.scopeChip,
                      {
                        borderColor: selected ? theme.tint : theme.divider,
                        backgroundColor: selected ? theme.tint : theme.backgroundSecondary,
                        opacity: isDownloading && !selected ? 0.55 : 1,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={choiceDone ? 'check-circle' : 'download'}
                      size={16}
                      color={selected ? '#fff' : theme.tint}
                    />
                    <CenteredText
                      numberOfLines={2}
                      style={[styles.scopeChipText, { color: selected ? '#fff' : theme.text }]}
                    >
                      {choice.label}
                    </CenteredText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {showReciters ? (
            <ScrollView style={styles.reciterList} contentContainerStyle={styles.reciterListContent}>
              {Object.values(RECITERS).map((item) => {
                const selected = item.key === reciter;
                return (
                  <Pressable
                    key={item.key}
                    testID={`quran-download-reciter-${item.key}`}
                    onPress={() => {
                      setReciter(item.key);
                      setProgress(null);
                      setError(null);
                    }}
                    disabled={isDownloading}
                    style={[
                      styles.reciterOption,
                      {
                        borderColor: selected ? theme.tint : theme.divider,
                        backgroundColor: selected ? theme.backgroundSecondary : theme.card,
                      },
                    ]}
                  >
                    {selected ? <MaterialIcons name="check" size={20} color={theme.tint} /> : <View style={styles.checkSpacer} />}
                    <View style={styles.reciterCopy}>
                      <CenteredText style={[styles.reciterOptionName, { color: selected ? theme.tint : theme.text }]}>
                        {item.name}
                      </CenteredText>
                      <CenteredText style={[styles.reciterQuality, { color: theme.textSecondary }]}>
                        {item.quality}
                      </CenteredText>
                    </View>
                    <View style={styles.checkSpacer} />
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <Pressable
            testID={`quran-download-${activeScope.type}`}
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
              {isComplete ? t('quran.downloaded') : primaryLabel}
            </CenteredText>
          </Pressable>

          <View style={styles.statusRow}>
            <CenteredText style={[styles.statusText, { color: theme.textSecondary }]}>
              {progressLabel}
            </CenteredText>
            {isDownloading ? (
              <Pressable testID="quran-download-cancel" onPress={() => controller?.abort()} hitSlop={8}>
                <CenteredText style={[styles.linkText, { color: theme.tint }]}>{t('quran.download.cancel')}</CenteredText>
              </Pressable>
            ) : showReciters ? null : (
              <Pressable testID="quran-download-change-reciter" onPress={() => setShowReciters(true)} hitSlop={8}>
                <CenteredText style={[styles.linkText, { color: theme.tint }]}>{t('quran.download.changeReciter')}</CenteredText>
              </Pressable>
            )}
          </View>
          {error ? <CenteredText style={[styles.error, { color: '#DC2626' }]}>{error}</CenteredText> : null}
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
  scopeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  scopeChip: {
    flex: 1,
    minHeight: 64,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  scopeChipText: {
    fontFamily: 'Vazirmatn',
    fontSize: Typography.ui.caption,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  reciterList: {
    maxHeight: 280,
  },
  reciterListContent: {
    gap: Spacing.xs,
  },
  reciterOption: {
    minHeight: 54,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  reciterCopy: {
    flex: 1,
    alignItems: 'center',
  },
  checkSpacer: {
    width: 20,
    height: 20,
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
