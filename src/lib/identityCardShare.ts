import type { IdentityCard } from './identityCardApi';

export const IDENTITY_CARD_SHARE_COPY = {
  confirmTitle: 'Partager ma Carte AFRICASECOUR',
  confirmMessage:
    'Seules vos informations publiques de progression seront partagées. Aucune donnée sensible ne sera incluse.',
  shareCancelled: 'Partage annulé.',
  disclaimer:
    "Cette carte est un profil pédagogique AFRICASECOUR. Elle ne remplace pas une pièce d'identité officielle, une certification professionnelle ou une formation agréée.",
} as const;

// Construit toujours à partir d'IdentityCard uniquement (jamais AuthUser/
// Passport, qui contiennent email/téléphone/commandes) — élimine tout
// risque de fuite d'un champ sensible dans le texte partagé.
export function buildIdentityCardMessage(card: IdentityCard): string {
  const rankLine = card.weekly_rank ? `Rang hebdo #${card.weekly_rank} • ` : '';
  return `Voici ma Carte d'identité AFRICASECOUR 🛡️\n\nJe suis ${card.title}.\n${rankLine}${card.completed_courses} cours terminés • ${card.badges_count} badges obtenus\n\nJ'apprends les gestes qui peuvent sauver des vies.\nRejoins AFRICASECOUR et prépare-toi aussi.`;
}
