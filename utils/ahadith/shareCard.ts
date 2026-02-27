import { RefObject } from 'react';
import { Platform, Share, View } from 'react-native';

interface ShareHadithCardParams {
  captureRef: RefObject<View | null>;
  fallbackMessage: string;
}

async function shareTextFallback(message: string): Promise<void> {
  await Share.share({ message, title: 'حدیث روز' });
}

export async function shareHadithCard({ captureRef, fallbackMessage }: ShareHadithCardParams): Promise<void> {
  const node = captureRef.current;
  if (!node) {
    await shareTextFallback(fallbackMessage);
    return;
  }

  try {
    const viewShotModuleName = 'react-native-view-shot';
    const sharingModuleName = 'expo-sharing';

    const viewShotModule = (await import(viewShotModuleName as any)) as any;
    const sharingModule = (await import(sharingModuleName as any)) as any;

    if (!viewShotModule?.captureRef || !sharingModule?.isAvailableAsync || !sharingModule?.shareAsync) {
      await shareTextFallback(fallbackMessage);
      return;
    }

    const isAvailable = await sharingModule.isAvailableAsync();
    if (!isAvailable) {
      await shareTextFallback(fallbackMessage);
      return;
    }

    const uri = await viewShotModule.captureRef(node, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    await sharingModule.shareAsync(uri, {
      mimeType: 'image/png',
      UTI: 'public.png',
      dialogTitle: 'اشتراک‌گذاری حدیث',
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[AhadithShare] Falling back to text share:', error);
    }

    if (Platform.OS !== 'web') {
      await shareTextFallback(fallbackMessage);
    }
  }
}
