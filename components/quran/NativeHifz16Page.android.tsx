import React, { memo, useMemo } from 'react';
import {
  requireNativeComponent,
  StyleSheet,
  type NativeSyntheticEvent,
  type ViewProps,
} from 'react-native';

import type { HifzPage } from '@/utils/hifz16';

type NativePressPayload = {
  page: number;
  surah?: number;
  ayah?: number;
};

type NativeHifz16PageProps = ViewProps & {
  pageJson: string;
  paperColor: string;
  inkColor: string;
  accentColor: string;
  contentTop: number;
  contentBottom: number;
  fontFamily?: string;
  activeSurah?: number;
  activeAyah?: number;
  onHifzLinePress?: (event: NativeSyntheticEvent<NativePressPayload>) => void;
  onHifzPagePress?: (event: NativeSyntheticEvent<NativePressPayload>) => void;
};

const NativePage = requireNativeComponent<NativeHifz16PageProps>('Hifz16PageView');

export const NativeHifz16Page = memo(function NativeHifz16Page({
  page,
  paperColor,
  inkColor,
  accentColor,
  contentTop,
  contentBottom,
  fontFamily,
  activePlayingSurah,
  activePlayingAyah,
  onAyahPress,
  onPagePress,
}: {
  page: HifzPage;
  paperColor: string;
  inkColor: string;
  accentColor: string;
  contentTop: number;
  contentBottom: number;
  fontFamily?: string;
  activePlayingSurah?: number | null;
  activePlayingAyah?: number | null;
  onAyahPress: (surah: number, ayah: number) => void;
  onPagePress: () => void;
}) {
  // The native view receives just one immutable page. This keeps the 2.2 MB
  // page map in Hermes and leaves Android drawing with a few KB per page turn.
  const pageJson = useMemo(() => JSON.stringify(page), [page]);

  return (
    <NativePage
      style={StyleSheet.absoluteFill}
      pageJson={pageJson}
      paperColor={paperColor}
      inkColor={inkColor}
      accentColor={accentColor}
      // The screen header and bottom controls are absolute overlays over the
      // full-screen page. Pass their layout insets in React Native dp; the
      // native view converts them to physical pixels before drawing.
      contentTop={contentTop}
      contentBottom={contentBottom}
      fontFamily={fontFamily}
      activeSurah={activePlayingSurah ?? 0}
      activeAyah={activePlayingAyah ?? 0}
      onHifzLinePress={(event) => {
        const { surah, ayah } = event.nativeEvent;
        if (surah && ayah) onAyahPress(surah, ayah);
      }}
      onHifzPagePress={onPagePress}
    />
  );
});
