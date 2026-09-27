import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { Naat } from '@/types/naat';
import type { AppLanguage } from '@/types/quran';
import { tUi } from '@/utils/i18n/ui';

function shareTitle(naat: Naat, language: AppLanguage): string {
  if (language === 'pashto') return naat.title_ps || naat.title_fa;
  if (language === 'english') return naat.title_fa;
  return naat.title_fa;
}

function isShareCancel(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /cancel|dismiss|abort/i.test(message);
}

/**
 * Shares a downloaded naat file through the system sheet.
 * On iOS that sheet includes WhatsApp when it is installed.
 */
export async function shareDownloadedNaat(naat: Naat, language: AppLanguage): Promise<void> {
  const title = tUi('اشتراک نعت', language);
  const uri = naat.localFileUri;
  if (!naat.isDownloaded || !uri) {
    Alert.alert(title, tUi('اول این نعت را دانلود کنید', language));
    return;
  }

  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists || info.isDirectory) {
      Alert.alert(title, tUi('فایل نعت روی دستگاه پیدا نشد', language));
      return;
    }

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert(title, tUi('اشتراک روی این دستگاه در دسترس نیست', language));
      return;
    }

    const isM4a = uri.toLowerCase().split('?')[0].endsWith('.m4a');
    await Sharing.shareAsync(uri, {
      mimeType: isM4a ? 'audio/mp4' : 'audio/mpeg',
      UTI: isM4a ? 'public.mpeg-4-audio' : 'public.mp3',
      dialogTitle: shareTitle(naat, language),
    });
  } catch (error) {
    if (isShareCancel(error)) return;
    Alert.alert(title, tUi('اشتراک این نعت ممکن نشد', language));
  }
}
