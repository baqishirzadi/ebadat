type DebugPayload = {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId?: string;
  runId?: string;
};

const DEBUG_LOG_SESSION_ID = '0458cd';
const DEBUG_LOG_INGEST_URL = 'http://127.0.0.1:7539/ingest/3537db95-4354-477c-bd78-e5ec9f53ce69';
const DEBUG_LOG_ENABLED = __DEV__ && false;
const DUPLICATE_LOG_WINDOW_MS = 1200;

let lastLogKey = '';
let lastLogAt = 0;

export function debugLog({ location, message, data, hypothesisId, runId }: DebugPayload): void {
  if (!DEBUG_LOG_ENABLED) {
    return;
  }

  const key = `${location}|${message}|${hypothesisId ?? ''}|${runId ?? ''}`;
  const now = Date.now();
  if (key === lastLogKey && now - lastLogAt < DUPLICATE_LOG_WINDOW_MS) {
    return;
  }
  lastLogKey = key;
  lastLogAt = now;

  const payload = {
    sessionId: DEBUG_LOG_SESSION_ID,
    location,
    message,
    data,
    hypothesisId,
    runId,
    timestamp: now,
  };

  // #region agent log
  fetch(DEBUG_LOG_INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': DEBUG_LOG_SESSION_ID },
    body: JSON.stringify(payload),
  }).catch(() => {});

  console.warn('[DBG0458cd]', JSON.stringify(payload));
  // #endregion
}
