import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

type PointsBadgeProps = {
  value: number;
  size?: 'small' | 'large';
};

// Pastille de points — la valeur est une donnée vérifiable : toujours en mono.
export function PointsBadge({ value, size = 'small' }: PointsBadgeProps) {
  const textStyle = size === 'large' ? typography.dataLarge : typography.data;

  return (
    <View style={styles.badge}>
      <Text style={[textStyle, styles.value]}>{value}</Text>
      <Text style={typography.caption}> pts</Text>
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
  value: {
    color: colors.successGreen,
  },
});
