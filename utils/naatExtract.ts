const PIPED_INSTANCES = [
  'https://piped.video',
  'https://piped.video/api/v1',
];

function getYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '');
    }
    if (parsed.searchParams.get('v')) {
      return parsed.searchParams.get('v');
    }
    const match = parsed.pathname.match(/\/embed\/([\w-]+)/) || parsed.pathname.match(/\/shorts\/([\w-]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function extractAudioUrl(youtubeUrl: string): Promise<string | null> {
  const videoId = getYouTubeId(youtubeUrl);
  if (!videoId) return null;

  for (const base of PIPED_INSTANCES) {
    const endpoint = base.includes('/api/v1') ? `${base}/streams/${videoId}` : `${base}/api/v1/streams/${videoId}`;
    try {
      const response = await fetch(endpoint);
      if (!response.ok) continue;
      const data = await response.json();
      const audioStreams = data?.audioStreams || [];
      if (!audioStreams.length) continue;
      // Pick highest bitrate audio-only stream
      const sorted = [...audioStreams].sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
      const best = sorted.find((s: any) => s.url) || sorted[0];
      if (best?.url) {
        return best.url;
      }
    } catch {
      // try next instance
    }
  }

  return null;
}
