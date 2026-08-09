export type HeadingSensorSource = 'location' | 'magnetometer' | 'none';

/**
 * Core Location reports -1 when neither a true nor a magnetic heading is ready.
 * Treating that as 359° makes an unavailable compass look like a valid reading.
 */
export function hasUsableLocationHeading(sample: { trueHeading: number; magHeading: number }): boolean {
  return sample.trueHeading >= 0 || sample.magHeading >= 0;
}

/**
 * A silent Core Location heading stream must not leave the compass indefinitely
 * in its loading state. The magnetometer is a degraded, but functional, fallback.
 */
export function shouldUseMagnetometerFallback({
  didReceiveHeadingWatchSample,
  fallbackAlreadyStarted,
}: {
  didReceiveHeadingWatchSample: boolean;
  fallbackAlreadyStarted: boolean;
}): boolean {
  return !didReceiveHeadingWatchSample && !fallbackAlreadyStarted;
}

export function nextUnavailableSource({
  locationPermissionDenied,
  magnetometerAvailable,
}: {
  locationPermissionDenied: boolean;
  magnetometerAvailable: boolean;
}): HeadingSensorSource {
  if (magnetometerAvailable) return 'magnetometer';
  return locationPermissionDenied ? 'none' : 'none';
}
