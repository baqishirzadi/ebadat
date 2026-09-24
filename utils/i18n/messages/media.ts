import type { UiMessage } from '../messageType';

/** Copy owned by the media screens. Keys are namespaced so this file can grow
 * without touching the shared catalog. */
export const mediaMessages = {
  'naat.downloads.storedSize': { dari: 'حجم ذخیره‌شده', pashto: 'ساتل شوې اندازه', english: 'Stored size' },
  'naat.downloads.downloaded': { dari: 'دانلود شده', pashto: 'ښکته شوي نعتونه', english: 'Downloaded naats' },
  'naat.downloads.empty': { dari: 'هنوز چیزی دانلود نشده است', pashto: 'لا څه نه دي ښکته شوي', english: 'Nothing has been downloaded yet' },
} as const satisfies Record<string, UiMessage>;
