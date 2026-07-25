import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, sizes, typography } from '@/constants/theme';

type OutlineButtonVariant = 'primary' | 'danger';

type OutlineButtonProps = {
  label: string;
  onPress: () => void;
  variant?: OutlineButtonVariant;
  stress?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const VARIANT_COLOR: Record<OutlineButtonVariant, string> = {
  primary: colors.trustBlue,
  danger: colors.emergencyRed,
};

export function OutlineButton({
  label,
  onPress,
  variant = 'primary',
  stress = false,
  disabled = false,
  style,
}: OutlineButtonProps) {
  const height = stress ? sizes.touchStress : sizes.touchMin;
  const tint = VARIANT_COLOR[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          borderColor: tint,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
        style,
      ]}>
      <Text style={[typography.bodyBold, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.button,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
