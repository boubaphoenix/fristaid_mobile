// Un ID vidéo YouTube fait toujours 11 caractères alphanumériques/-/_.
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function isValidYoutubeVideoId(value: unknown): value is string {
  return typeof value === 'string' && YOUTUBE_ID_RE.test(value);
}

export function buildYoutubeEmbedUrl(videoId: string): string | null {
  return isValidYoutubeVideoId(videoId) ? `https://www.youtube.com/embed/${videoId}` : null;
}
