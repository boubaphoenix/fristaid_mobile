import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radius, sizes, spacing, typography } from '@/constants/theme';

type GoogleButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function GoogleButton({ onPress, disabled = false, style }: GoogleButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continuer avec Google"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
        style,
      ]}>
      <GoogleGlyph size={20} />
      <Text style={[typography.bodyBold, styles.label]}>Continuer avec Google</Text>
    </Pressable>
  );
}

function GoogleGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z"
      />
      <Path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 16.3 3 9.7 7.3 6.3 14.7z"
      />
      <Path
        fill="#4CAF50"
        d="M24 45c5.4 0 10.3-1.8 14.1-5l-6.5-5.5C29.6 36.1 26.9 37 24 37c-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.6 40.6 16.3 45 24 45z"
      />
      <Path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.5 5.5C40.9 36.9 45 31 45 24c0-1.4-.1-2.7-.4-3.5z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  base: {
    height: sizes.touchMin,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    color: colors.darkText,
  },
});
