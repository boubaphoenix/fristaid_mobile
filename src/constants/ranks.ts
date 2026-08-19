export type RankLevel = {
  id: string;
  minPoints: number;
  maxPoints: number | null;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
  badgeEmoji: string;
  iconName: string;
  description: string;
};

export const RANKS: RankLevel[] = [
  {
    id: 'apprenant',
    minPoints: 0,
    maxPoints: 99,
    title: 'Apprenant Secours',
    subtitle: 'Niveau 1 — Initiation aux gestes de secours',
    color: '#CD7F32',
    bgColor: '#FFF7ED',
    badgeEmoji: '🌱',
    iconName: 'school-outline',
    description: "Premier pas dans l'apprentissage des gestes d'urgence.",
  },
  {
    id: 'citoyen',
    minPoints: 100,
    maxPoints: 249,
    title: 'Citoyen Préparé',
    subtitle: 'Niveau 2 — Connaissances de base validées',
    color: '#64748B',
    bgColor: '#F1F5F9',
    badgeEmoji: '🛡️',
    iconName: 'shield-checkmark-outline',
    description: "Prêt à réagir efficacement face aux situations d'urgence.",
  },
  {
    id: 'reflexe',
    minPoints: 250,
    maxPoints: 499,
    title: 'Réflexe Secours',
    subtitle: 'Niveau 3 — Réaction rapide et précise',
    color: '#D97706',
    bgColor: '#FEF3C7',
    badgeEmoji: '⚡',
    iconName: 'flash-outline',
    description: "Maîtrise de la chaîne d'alerte et des premiers gestes réflexes.",
  },
  {
    id: 'gardien',
    minPoints: 500,
    maxPoints: 999,
    title: 'Gardien de Vie',
    subtitle: 'Niveau 4 — Protecteur de sa communauté',
    color: '#059669',
    bgColor: '#D1FAE5',
    badgeEmoji: '💚',
    iconName: 'heart-circle-outline',
    description: 'Protecteur actif capable d\'intervenir sur les urgences vitales.',
  },
  {
    id: 'sentinelle',
    minPoints: 1000,
    maxPoints: 1999,
    title: 'Sentinelle AFRICASECOUR',
    subtitle: 'Niveau 5 — Veilleur et premier répondant',
    color: '#2563EB',
    bgColor: '#DBEAFE',
    badgeEmoji: '👁️‍🗨️',
    iconName: 'eye-outline',
    description: 'Point de vigilance local prêt à porter assistance.',
  },
  {
    id: 'leader',
    minPoints: 2000,
    maxPoints: 3499,
    title: 'Leader Prévention',
    subtitle: 'Niveau 6 — Promoteur des règles de sécurité',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
    badgeEmoji: '🔥',
    iconName: 'flame-outline',
    description: 'Inspiration pour ses proches et organisateur de prévention.',
  },
  {
    id: 'ambassadeur',
    minPoints: 3500,
    maxPoints: 4999,
    title: 'Ambassadeur Secours',
    subtitle: "Niveau 7 — Représentant d'excellence",
    color: '#CA8A04',
    bgColor: '#FEF08A',
    badgeEmoji: '🎖️',
    iconName: 'ribbon-outline',
    description: 'Expert engagé dans la diffusion des gestes qui sauvent.',
  },
  {
    id: 'maitre',
    minPoints: 5000,
    maxPoints: null,
    title: 'Maître des Bons Gestes',
    subtitle: 'Niveau Élites (5000+ pts) — Suprême accomplissement',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    badgeEmoji: '👑',
    iconName: 'trophy-outline',
    description: 'Maître incontesté du secourisme et héros du quotidien.',
  },
];

export function getRankProgress(points: number) {
  const currentRank =
    RANKS.find((r) => {
      if (r.maxPoints === null) return points >= r.minPoints;
      return points >= r.minPoints && points <= r.maxPoints;
    }) || RANKS[0];

  const currentIndex = RANKS.indexOf(currentRank);
  const nextRank = currentIndex < RANKS.length - 1 ? RANKS[currentIndex + 1] : null;

  const pointsToNext = nextRank ? nextRank.minPoints - points : 0;

  let progressPercent = 100;
  if (nextRank && currentRank.maxPoints !== null) {
    const range = nextRank.minPoints - currentRank.minPoints;
    const gained = points - currentRank.minPoints;
    progressPercent = Math.min(100, Math.max(0, Math.round((gained / range) * 100)));
  }

  return {
    currentRank,
    nextRank,
    pointsToNext,
    progressPercent,
  };
}
