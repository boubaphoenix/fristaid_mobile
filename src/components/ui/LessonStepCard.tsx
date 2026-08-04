import { Image } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

import { ResponsibilityNote } from './ResponsibilityNote';

type LessonStepCardProps = {
  index: number;
  total: number;
  title: string;
  imageSource?: number;
  imageAlt: string;
  description: string;
  warningText?: string | null;
  style?: StyleProp<ViewStyle>;
};

// Une étape illustrée d'un geste (titre + image + texte + erreur à
// éviter). Complète la vidéo/le texte de la leçon, ne les remplace pas.
export function LessonStepCard({
  index,
  total,
  title,
  imageSource,
  imageAlt,
  description,
  warningText,
  style,
}: LessonStepCardProps) {
  return (
    <View style={[styles.card, style]}>
      <Text style={[typography.data, styles.muted]}>
        Étape {index}/{total}
      </Text>
      <Text style={[typography.bodyBold, styles.title]}>{title}</Text>
      {imageSource ? (
        <Image
          source={imageSource}
          style={styles.image}
          contentFit="cover"
          accessibilityLabel={imageAlt}
        />
      ) : null}
      <Text style={[typography.body, styles.description]}>{description}</Text>
      {warningText ? <ResponsibilityNote text={`⚠️ À éviter : ${warningText}`} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.sm,
  },
  muted: {
    color: colors.mutedText,
  },
  title: {
    color: colors.darkText,
    marginTop: spacing.xs,
  },
  image: {
    aspectRatio: 4 / 3,
    width: '100%',
    borderRadius: radius.card,
    marginTop: spacing.sm,
  },
  description: {
    color: colors.darkText,
    marginTop: spacing.sm,
  },
});
