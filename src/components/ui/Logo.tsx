import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { brand, colors, fonts, spacing, typography } from '@/constants/theme';

export type LogoVariant = 'onCream' | 'onForest';

const BADGE_COLOR: Record<LogoVariant, string> = {
  onCream: brand.forest,
  onForest: brand.sage,
};

const INNER_CIRCLE_COLOR: Record<LogoVariant, string> = {
  onCream: brand.creamCard,
  onForest: brand.forest,
};

const AFRICA_TEXT_COLOR: Record<LogoVariant, string> = {
  onCream: brand.forest,
  onForest: colors.white,
};

type LogoMarkProps = {
  size?: number;
  variant?: LogoVariant;
};

// Approximation vectorielle du badge (planche de marque Banani) : croix
// arrondie + pointe basse évoquant un pin/bouclier de secours, inscrite
// dans un cercle intérieur, le tout dans un badge rond. Recréé en SVG car
// aucun fichier source (PNG/SVG exporté) n'est disponible — remplacer ce
// composant si les vrais assets sont fournis un jour.
export function LogoMark({ size = 96, variant = 'onCream' }: LogoMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={50} fill={BADGE_COLOR[variant]} />
      <Circle cx={50} cy={50} r={38} fill={INNER_CIRCLE_COLOR[variant]} />
      <Rect x={44} y={30} width={12} height={32} rx={6} fill={brand.terracotta} />
      <Rect x={32} y={38} width={36} height={12} rx={6} fill={brand.terracotta} />
      <Path d="M42,58 L58,58 L50,73 Z" fill={brand.terracotta} />
    </Svg>
  );
}

type WordmarkProps = {
  size?: number;
  variant?: LogoVariant;
};

export function Wordmark({ size = 28, variant = 'onCream' }: WordmarkProps) {
  return (
    <Text style={{ fontFamily: fonts.displayBlack, fontSize: size, letterSpacing: -0.5 }}>
      <Text style={{ color: AFRICA_TEXT_COLOR[variant] }}>AFRICA</Text>
      <Text style={{ color: brand.terracotta }}>SECOURS</Text>
    </Text>
  );
}

type LogoLockupProps = {
  markSize?: number;
  wordmarkSize?: number;
  variant?: LogoVariant;
  tagline?: boolean;
};

export function LogoLockup({
  markSize = 96,
  wordmarkSize = 28,
  variant = 'onCream',
  tagline = true,
}: LogoLockupProps) {
  return (
    <View style={styles.lockup}>
      <LogoMark size={markSize} variant={variant} />
      <Wordmark size={wordmarkSize} variant={variant} />
      {tagline ? (
        <Text
          style={[
            typography.caption,
            styles.tagline,
            { color: variant === 'onForest' ? brand.mutedOnDark : brand.mutedOnLight },
          ]}>
          URGENCE · SECOURS · VIE
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  tagline: {
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
