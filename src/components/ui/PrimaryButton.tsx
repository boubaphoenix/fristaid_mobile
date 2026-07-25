import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, sizes, typography } from '@/constants/theme';

type PrimaryButtonVariant = 'primary' | 'success' | 'danger';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  variant?: PrimaryButtonVariant;
  stress?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

const VARIANT_COLOR: Record<PrimaryButtonVariant, string> = {
  primary: colors.trustBlue,
  success: colors.successGreen,
  danger: colors.emergencyRed,
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
