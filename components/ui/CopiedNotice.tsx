import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RtlText } from '@/components/ui/RtlText';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

const VISIBLE_MS = 1600;

/** Short “copied” confirmation, the same on iPhone and Android. */
export function useCopiedNotice() {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCopied = useCallback(() => {
    setVisible(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), VISIBLE_MS);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { copiedVisible: visible, showCopied };
}

export function CopiedNotice({ visible, label }: { visible: boolean; label: string }) {
  const { theme } = useApp();
  if (!visible) return null;
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={[styles.pill, { backgroundColor: theme.text }]}>
        <RtlText style={[styles.label, { color: theme.background }]}>{label}</RtlText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Spacing.xl,
    alignItems: 'center',
    zIndex: 20,
  },
  pill: {
        borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
