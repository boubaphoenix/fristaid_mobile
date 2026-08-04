import type { IdentityCard } from './identityCardApi';

export const IDENTITY_CARD_SHARE_COPY = {
  confirmTitle: 'Partager ma Carte AFRICASECOUR',
  confirmMessage:
    'Seules vos informations publiques de progression seront partagées. Aucune donnée sensible ne sera incluse.',
  shareCancelled: 'Partage annulé.',
  facebookCopyHint: 'Message copié — collez-le dans votre publication Facebook.',
  disclaimer:
    "Cette carte est un profil pédagogique AFRICASECOUR. Elle ne remplace pas une pièce d'identité officielle, une certification professionnelle ou une formation agréée.",
  lockedTitle: 'Carte pas encore partageable',
  lockedMessage:
    'Votre carte sera partageable après 3 circuits pédagogiques complets.\nUn circuit = cours terminé + quiz réussi + simulation réussie + mission validée.',
  downloadConfirmTitle: 'Télécharger ma Carte AFRICASECOUR',
  downloadSaved: 'Carte téléchargée.',
  downloadPermissionDenied: "Autorisation refusée — impossible d'enregistrer la carte dans vos photos.",
  downloadFailed: 'Le téléchargement a échoué. Réessayez.',
} as const;

// Construit toujours à partir d'IdentityCard uniquement (jamais AuthUser/
// Passport, qui contiennent email/téléphone/commandes) — élimine tout
// risque de fuite d'un champ sensible dans le texte partagé.
export function buildIdentityCardMessage(card: IdentityCard): string {
  const rankLine = card.weekly_rank ? `Rang hebdo #${card.weekly_rank} • ` : '';
  return `Voici ma Carte d'identité AFRICASECOUR 🛡️\n\nJe suis ${card.title}.\n${rankLine}${card.completed_courses} cours terminés • ${card.badges_count} badges obtenus\n\nJ'apprends les gestes qui peuvent sauver des vies.\nRejoins AFRICASECOUR et prépare-toi aussi.`;
}
