// Un ID vidéo YouTube fait toujours 11 caractères alphanumériques/-/_.
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function isValidYoutubeVideoId(value: unknown): value is string {
  return typeof value === 'string' && YOUTUBE_ID_RE.test(value);
}

export function buildYoutubeEmbedUrl(videoId: string): string | null {
  // youtube-nocookie.com : variante de YouTube qui ne pose pas de cookies
  // de suivi tant que l'utilisateur n'a pas interagi avec la vidéo (web
  // uniquement — le lecteur natif react-native-youtube-iframe ne prend
  // qu'un videoId, pas cette URL).
  return isValidYoutubeVideoId(videoId) ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
}
