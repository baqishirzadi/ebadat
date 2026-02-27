import { ensurePushRegistrationOnFirstOpen } from '@/utils/pushRegistry';

export async function ensureArticlePushRegistrationOnFirstOpen(): Promise<void> {
  return ensurePushRegistrationOnFirstOpen();
}
