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
  contentTop: number;
  contentBottom: number;
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
  contentTop,
  contentBottom,
  activePlayingSurah,
  activePlayingAyah,
  onAyahPress,
  onPagePress,
}: {
  page: HifzPage;
  paperColor: string;
  inkColor: string;
  contentTop: number;
  contentBottom: number;
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
      // The native frame draws its own metadata strip. Keep its first Quran
      // row below the React Native reader header on tall and short Androids.
      contentTop={contentTop + 28}
      contentBottom={contentBottom}
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
