import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

type GestureCardProps = {
  title: string;
  imageSource: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

// Carte carrée image + légende — grille des "gestes essentiels" sur
// l'accueil. Même traitement visuel que Card (bordure 1px, radius.card,
// aucune ombre) pour rester cohérent avec le reste du design system.
export function GestureCard({ title, imageSource, onPress, style }: GestureCardProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={[styles.card, style]}>
      <Image source={imageSource} style={styles.image} contentFit="cover" />
      <Text style={[typography.bodyBold, styles.label]} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  image: {
    aspectRatio: 1,
    width: '100%',
  },
  label: {
    color: colors.darkText,
    padding: spacing.sm,
    textAlign: 'center',
  },
});
