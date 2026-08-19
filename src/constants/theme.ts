// mobile/src/constants/theme.ts
// AFRICASECOUR — source de vérité visuelle. Ne jamais coder une valeur en dur ailleurs.

export const colors = {
  emergencyRed: '#D62828',
  trustBlue: '#1565C0',
  successGreen: '#2E7D32',
  warningOrange: '#F57C00',
  lightGray: '#F5F7FA',
  white: '#FFFFFF',
  darkText: '#263238',
  mutedText: '#607D8B',
  border: '#E0E0E0',
  stressSubtext: '#B0BEC5',

  // fonds de blocs (couleur de rôle à faible opacité)
  successBg: 'rgba(46, 125, 50, 0.12)',
  emergencyBg: 'rgba(214, 40, 40, 0.10)',
  warningBg: 'rgba(245, 124, 0, 0.12)',
  trustBg: 'rgba(21, 101, 192, 0.10)',
} as const;

// Nouvelle identité de marque (planche Banani, 2026-07). Séparée de
// `colors` : `colors` reste le code couleur sémantique de sécurité
// (urgence/succès/avertissement), `brand` est l'habillage visuel
// (fond, primaire, accent) réutilisé sur landing/onboarding/écran de
// chargement.
export const brand = {
  forest: '#16342A',
  forestDeep: '#122A22',
  terracotta: '#C8552C',
  cream: '#F1ECE0',
  creamCard: '#FFFFFF',
  sage: '#8CA290',
  mutedOnDark: 'rgba(255,255,255,0.55)',
  mutedOnLight: '#7C8571',
} as const;

export const fonts = {
  display: 'Archivo_700Bold',
  displayBlack: 'Archivo_800ExtraBold',
  body: 'IBMPlexSans_400Regular',
  bodyBold: 'IBMPlexSans_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
  monoBold: 'IBMPlexMono_600SemiBold',
} as const;

export const typography = {
  h1:       { fontFamily: fonts.display, fontSize: 32, lineHeight: 42, letterSpacing: -0.6 },
  h2:       { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, letterSpacing: -0.5 },
  h3:       { fontFamily: fonts.display, fontSize: 20, lineHeight: 26, letterSpacing: -0.4 },
  body:     { fontFamily: fonts.body,     fontSize: 16, lineHeight: 24 },
  bodyBold: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 24 },
  small:    { fontFamily: fonts.body,     fontSize: 14, lineHeight: 20 },
  caption:  { fontFamily: fonts.body,     fontSize: 12, lineHeight: 16 },
  // Variante grasse de `small`, utilisée pour le texte sur fond de couleur
  // (ResponsibilityNote) — `caption` seul est trop petit/fin pour rester
  // lisible sur mobile dans ce contexte.
  smallBold:{ fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20 },
  // données vérifiables — toujours en mono
  data:     { fontFamily: fonts.mono,     fontSize: 16, lineHeight: 24 },
  dataLarge:{ fontFamily: fonts.monoBold, fontSize: 32, lineHeight: 42 },
  // Score final quiz/simulation — plus grand que dataLarge, isolé pour ne
  // pas gonfler la taille des données courantes affichées ailleurs.
  scoreDisplay: { fontFamily: fonts.monoBold, fontSize: 64, lineHeight: 76 },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screenPadding: 20, // exception imposée par le PRD
} as const;

export const radius = {
  none: 0,
  button: 4,
  pill: 4,
  card: 8, // maximum absolu
  // Exception documentée à la règle ci-dessus : réservé exclusivement à la
  // pilule flottante de la nav basse (FloatingTabBar), même principe que
  // shadows.elevationNav plus bas.
  navPill: 28,
} as const;

export const sizes = {
  touchMin: 56,
  touchStress: 72,
  inputHeight: 56,
  sosButtonHeight: 120,
  cardMinHeight: 88,
  bannerHeight: 56,
  chevronHeight: 8,
  navHeight: 64,
  // Diamètre du cercle SOS qui déborde de la pilule de nav — plus petit
  // que sosButtonHeight (bouton SOS de l'écran d'accueil), même patron
  // (borderRadius = taille / 2).
  navBarSosSize: 64,
} as const;

// Deux régimes visuels. Sélectionner via un contexte ou une prop d'écran.
export const modeNormal = {
  background: colors.lightGray,
  text: colors.darkText,
  textMuted: colors.mutedText,
  minContrast: 4.5,
} as const;

export const modeStress = {
  background: colors.darkText,
  text: colors.white,
  textMuted: colors.stressSubtext,
  banner: colors.emergencyRed,
  buttonHeight: sizes.touchStress,
  minContrast: 7,
} as const;

export const shadows = {
  // interdit ailleurs ; réservé nav basse et bouton fixe
  elevationNav: {
    shadowColor: colors.darkText,
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 3,
  },
} as const;

export const theme = {
  colors,
  brand,
  fonts,
  typography,
  spacing,
  radius,
  sizes,
  modeNormal,
  modeStress,
  shadows,
} as const;

export type Theme = typeof theme;
export default theme;
