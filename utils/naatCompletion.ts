export type NaatCompletionCandidate = {
  eligible: boolean;
  positionSeconds: number;
  durationSeconds: number;
};

/**
 * Only accept a naturally completed track when its playback began from the
 * beginning and no seek/skip invalidated that listening session.
 */
export function shouldAutoDownloadCompletedNaat(candidate: NaatCompletionCandidate): boolean {
  const { eligible, positionSeconds, durationSeconds } = candidate;
  if (!eligible || !Number.isFinite(positionSeconds) || !Number.isFinite(durationSeconds)) {
    return false;
  }
  if (positionSeconds < 0 || durationSeconds <= 0) return false;

  const endToleranceSeconds = Math.max(2, durationSeconds * 0.01);
  return positionSeconds >= durationSeconds - endToleranceSeconds;
}
