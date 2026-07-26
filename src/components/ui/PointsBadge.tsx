import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

type PointsBadgeProps = {
  value: number;
  size?: 'small' | 'large';
  // Grisé pour une mission/action déjà validée (les points ne seront plus
  // gagnés en la rejouant) — voir écran 16, règle "points grisés".
  muted?: boolean;
};

// Pastille de points — la valeur est une donnée vérifiable : toujours en mono.
export function PointsBadge({ value, size = 'small', muted = false }: PointsBadgeProps) {
  const textStyle = size === 'large' ? typography.dataLarge : typography.data;

  return (
    <View style={[styles.badge, muted && styles.badgeMuted]}>
      <Text style={[textStyle, styles.value, muted && styles.valueMuted]}>{value}</Text>
      <Text style={[typography.caption, muted && styles.valueMuted]}> pts</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.successBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  badgeMuted: {
    backgroundColor: colors.lightGray,
  },
  value: {
    color: colors.successGreen,
  },
  valueMuted: {
    color: colors.mutedText,
  },
});
