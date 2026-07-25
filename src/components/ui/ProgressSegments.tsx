import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

type ProgressSegmentsProps = {
  count: number;
  total: number;
  height?: number;
};

// Progression en segments rectangulaires pleins (pas de barre continue).
export function ProgressSegments({ count, total, height = 8 }: ProgressSegmentsProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            {
              height,
              backgroundColor: index < count ? colors.trustBlue : colors.border,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    borderRadius: radius.pill,
  },
});
