// Gabarits de message WhatsApp pré-rempli — voir src/lib/whatsapp.ts pour
// la mécanique d'envoi (générique, réutilisable ailleurs).

export function buildLessonErrorMessage(courseName: string): string {
  return `Bonjour, je signale une erreur possible dans le cours « ${courseName} ».\n\nDescription : `;
}

export type ContactCategory = { key: string; label: string };

export const CONTACT_CATEGORIES: readonly ContactCategory[] = [
  { key: 'course_error', label: 'Erreur dans un cours' },
  { key: 'technical_issue', label: 'Problème technique' },
  { key: 'suggestion', label: 'Suggestion' },
  { key: 'other', label: 'Autre' },
] as const;

export function buildGeneralContactMessage(categoryLabel: string): string {
  return `Bonjour, je vous contacte au sujet de : ${categoryLabel}\n\n`;
}

export function buildKitAvailabilityMessage(): string {
  return 'Bonjour, je souhaite être informé(e) dès que le kit de premiers secours sera disponible à l\'achat.';
}
