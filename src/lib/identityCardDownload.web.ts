export type DownloadOutcome = 'saved' | 'permission_denied';

// Variante web : téléchargement navigateur standard via un lien <a download>
// temporaire, aucune dépendance native. Voir identityCardDownload.ts pour
// la raison de la séparation par extension de fichier.
export async function saveIdentityCardImage(uri: string): Promise<DownloadOutcome> {
  if (typeof document === 'undefined') return 'saved';
  const link = document.createElement('a');
  link.href = uri;
  link.download = 'carte-identite-africasecour.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return 'saved';
}
