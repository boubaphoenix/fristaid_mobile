// Natif uniquement. Le retour de Google Sign-In (<scheme>:/oauthredirect?code=…)
// est un lien profond : sans ce filtre, expo-router essaie d'ouvrir une page
// "oauthredirect" qui n'existe pas ("Unmatched Route") et démonte l'écran de
// connexion qui attend la réponse. expo-auth-session reçoit l'URL de son côté,
// donc on ne navigue nulle part (une chaîne vide = pas de navigation).
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  if (path.includes('oauthredirect')) {
    return initial ? '/' : '';
  }
  return path;
}
