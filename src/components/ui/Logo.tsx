import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText, TextPath } from 'react-native-svg';

import { brand, colors, fonts, spacing, typography } from '@/constants/theme';

export type LogoVariant = 'onCream' | 'onForest';

const AFRICA_TEXT_COLOR: Record<LogoVariant, string> = {
  onCream: brand.forest,
  onForest: colors.white,
};

type LogoMarkProps = {
  size?: number;
};

// Icône de marque réelle (bouclier + croix), générée par
// scripts/generate-adaptive-icon.mjs depuis assets/source/logo.png — le
// même fichier qui produit l'icône d'app et les icônes PWA, pour garantir
// que le logo affiché dans l'app soit identique partout. Le fond forêt est
// déjà intégré à l'image : il se fond dans les écrans à fond forêt et
// contraste tel quel sur les écrans à fond clair, donc plus besoin de
// variante de couleur ici (contrairement à l'ancienne version dessinée à
// la main).
export function LogoMark({ size = 96 }: LogoMarkProps) {
  return (
    <Image
      source={require('../../../assets/images/icon.png')}
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
      contentFit="cover"
    />
  );
}

// Sceau circulaire pour la carte d'identité : logo au centre, entouré du
// texte "APPRENDRE • AGIR • PROTÉGER • ENGAGÉ" courbé le long du cercle
// (react-native-svg Text/TextPath — supporté natif + web). Le texte suit
// un cercle presque complet (l'arc "1,1" avec un point d'écart en bas
// évite de fermer complètement le chemin, ce qui casserait le rendu).
export function LogoSeal({ size = 88 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={49} fill={brand.terracotta} />
      <Circle cx={50} cy={50} r={44} fill={brand.forest} />
      <Path id="sealTextPath" d="M 50,8 A 42,42 0 1,1 49.9,8" fill="none" />
      <SvgText fill={colors.white} fontSize={8.6} fontWeight="bold" letterSpacing={1.4}>
        <TextPath href="#sealTextPath" startOffset="1%">
          APPRENDRE • AGIR • PROTÉGER • ENGAGÉ •
        </TextPath>
      </SvgText>
      <Circle cx={50} cy={50} r={26} fill={brand.creamCard} />
      <Rect x={44} y={34} width={12} height={28} rx={5} fill={brand.terracotta} />
      <Rect x={36} y={41} width={28} height={12} rx={5} fill={brand.terracotta} />
      <Path d="M42,60 L58,60 L50,73 Z" fill={brand.terracotta} />
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
      <LogoMark size={markSize} />
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
