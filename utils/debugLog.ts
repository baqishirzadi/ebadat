type DebugPayload = {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId?: string;
  runId?: string;
};

export function debugLog({ location, message, data, hypothesisId, runId }: DebugPayload): void {
  const payload = {
    sessionId: '0458cd',
    location,
    message,
    data,
    hypothesisId,
    runId,
    timestamp: Date.now(),
  };

  // #region agent log
  fetch('http://127.0.0.1:7539/ingest/3537db95-4354-477c-bd78-e5ec9f53ce69', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '0458cd' },
    body: JSON.stringify(payload),
  }).catch(() => {});

  if (__DEV__) {
    console.warn('[DBG0458cd]', JSON.stringify(payload));
  } else {
    console.log('[DBG0458cd]', JSON.stringify(payload));
  }
  // #endregion
}
