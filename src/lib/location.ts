import * as Location from 'expo-location';

export type LocationResult =
  | { status: 'granted'; latitude: number; longitude: number; accuracy: number | null }
  | { status: 'denied' }
  | { status: 'unavailable' };

// Ne JAMAIS appeler ailleurs qu'au tap du bouton de partage (écran 14) —
// pas de demande de permission au démarrage, pas de tracking en tâche de
// fond, une seule mesure ponctuelle par appel.
export async function requestAndGetCurrentPosition(): Promise<LocationResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return { status: 'denied' };
  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      status: 'granted',
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  } catch {
    return { status: 'unavailable' };
  }
}

export function buildGoogleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

// Les coordonnées brutes sont toujours ajoutées après le lien (pas
// seulement en cas de connexion faible) : plus simple et plus robuste
// qu'une détection de connectivité peu fiable en React Native, et
// satisfait la même exigence produit (rester utile même si le lien
// Google Maps ne s'ouvre pas).
export function buildEmergencyMessage(
  latitude: number,
  longitude: number,
  variant: 'long' | 'short' = 'long',
): string {
  const url = buildGoogleMapsUrl(latitude, longitude);
  const coords = `Latitude : ${latitude}\nLongitude : ${longitude}`;
  if (variant === 'short') {
    return `Urgence. Voici ma position approximative :\n${url}\n\n${coords}`;
  }
  return `URGENCE AFRICASECOUR\n\nJ'ai besoin d'aide. Voici ma position approximative :\n${url}\n\nAppelez-moi rapidement ou contactez les secours.\n\n${coords}`;
}

export const LOCATION_SHARE_COPY = {
  confirmTitle: 'Partager ma position',
  confirmMessage: 'Votre position approximative sera ajoutée dans un message que vous pourrez envoyer vous-même.',
  permissionDeniedTitle: 'Localisation non autorisée',
  permissionDenied:
    'Localisation non autorisée.\nVous pouvez activer la localisation dans les réglages du téléphone pour partager votre position.',
  positionUnavailableTitle: 'Position indisponible',
  positionUnavailable:
    'Impossible de récupérer votre position pour le moment.\nVérifiez votre GPS ou votre connexion, puis réessayez.',
  shareCancelled: 'Partage annulé.',
} as const;
