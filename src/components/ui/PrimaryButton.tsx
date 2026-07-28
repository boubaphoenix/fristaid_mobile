import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { brand, colors, radius, sizes, typography } from '@/constants/theme';

type PrimaryButtonVariant = 'primary' | 'success' | 'danger' | 'brand';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  variant?: PrimaryButtonVariant;
  stress?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

// `brand` (terracotta) = actions sur les surfaces de marque (welcome,
// onboarding, écran de chargement post-connexion) et sur les CTA d'entrée
// de l'app. `primary` (trustBlue) reste la couleur des actions in-app
// existantes (Académie, Missions, Profil, etc.), non touchée par la
// refonte de marque. `success`/`danger` restent le code couleur
// sémantique de sécurité, jamais décoratif.
const VARIANT_COLOR: Record<PrimaryButtonVariant, string> = {
  primary: colors.trustBlue,
  success: colors.successGreen,
  danger: colors.emergencyRed,
  brand: brand.terracotta,
};

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  stress = false,
  disabled = false,
  loading = false,
  style,
}: PrimaryButtonProps) {
  const height = stress ? sizes.touchStress : sizes.touchMin;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: VARIANT_COLOR[variant],
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={[typography.bodyBold, styles.label]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  label: {
    color: colors.white,
  },
});
