import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, sizes, spacing } from '@/constants/theme';

type CardProps = PropsWithChildren<{
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
}>;

// Bloc de contenu — rayon 8px maximum, aucune ombre (direction "blocs pleins").
export function Card({ minHeight = sizes.cardMinHeight, style, children }: CardProps) {
  return <View style={[styles.card, { minHeight }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
});
