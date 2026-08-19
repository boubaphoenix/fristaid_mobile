// Valide qu'une URL est bien https:// avant toute ouverture externe —
// rejette http:, javascript:, data:, file:, etc. Utilise le constructeur
// URL (analyse robuste) plutôt qu'une regex.
export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

// Point de passage unique pour ouvrir une URL externe sur web : valide
// https puis applique systématiquement noopener,noreferrer (empêche
// window.opener / tabnabbing). Ne fait rien si l'URL est invalide.
export function openHttpsUrl(url: string): boolean {
  if (!isHttpsUrl(url) || typeof window === 'undefined') return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

// tel: n'est pas une URL https (schéma légitime différent) — on valide
// séparément que la valeur ne contient que des caractères de numéro de
// téléphone avant de construire l'URL. Le numéro vient désormais du
// dashboard admin (voir context/EmergencyContactsContext.tsx) : cette
// validation reste la seule barrière contre un schéma malformé si la
// valeur distante est un jour corrompue.
const TEL_SAFE_RE = /^[0-9+\-\s().]{1,20}$/;

export function buildTelUrl(phoneNumber: string): string | null {
  if (typeof phoneNumber !== 'string') return null;
  const trimmed = phoneNumber.trim();
  return TEL_SAFE_RE.test(trimmed) ? `tel:${trimmed}` : null;
}
