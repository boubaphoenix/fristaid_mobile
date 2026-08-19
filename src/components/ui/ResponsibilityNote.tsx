import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

type ResponsibilityNoteProps = {
  text: string;
};

// Encart de mention pédagogique — bordé orange, en caption mais toujours
// parfaitement lisible (jamais en mutedText, voir design-tokens §11).
export function ResponsibilityNote({ text }: ResponsibilityNoteProps) {
  return (
    <View style={styles.note}>
      <Text style={[typography.smallBold, styles.text]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    borderWidth: 1,
    borderColor: colors.warningOrange,
    backgroundColor: colors.warningBg,
    borderRadius: radius.card,
    padding: spacing.sm,
  },
  text: {
    color: colors.darkText,
  },
});
