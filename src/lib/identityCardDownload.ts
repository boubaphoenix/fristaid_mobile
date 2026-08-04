import * as MediaLibrary from 'expo-media-library';

export type DownloadOutcome = 'saved' | 'permission_denied';

// Fichier natif uniquement — la variante .web.ts prend le relais sur web.
// expo-media-library ne doit jamais être importé dans le bundle web : ses
// classes (Query/Asset/Album) étendent des classes natives absentes du
// rendu web/SSR, ce qui casse le bundle au chargement du module (pas
// seulement à l'appel).
export async function saveIdentityCardImage(uri: string): Promise<DownloadOutcome> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') return 'permission_denied';
  await MediaLibrary.saveToLibraryAsync(uri);
  return 'saved';
}
