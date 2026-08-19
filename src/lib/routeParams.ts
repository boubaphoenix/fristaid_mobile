const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_ID_RE = /^[1-9][0-9]*$/;

export function isUuidLike(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function isNumericId(value: unknown): value is string {
  return typeof value === 'string' && NUMERIC_ID_RE.test(value);
}

// Les identifiants de ce backend (kits, orders, courses, lessons, missions,
// certificates — voir src/lib/*Api.ts) sont des UUID en pratique ; on
// accepte aussi une forme numérique par prudence. Objectif réel : empêcher
// qu'un segment de route corrompu (`../`, `?`, `#`, espaces, etc.), reçu
// via un deep link, atteigne une requête fetch authentifiée.
export function isValidRecordId(value: unknown): value is string {
  return isUuidLike(value) || isNumericId(value);
}

// Validateur générique de liste blanche pour des paramètres de route à
// ensemble fermé (ex. role/incident du parcours SOS).
export function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}
