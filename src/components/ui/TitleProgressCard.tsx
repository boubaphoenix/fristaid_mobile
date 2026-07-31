import { StyleSheet, Text } from 'react-native';

import { Card } from './Card';
import { colors, spacing, typography } from '@/constants/theme';

type TitleProgressCardProps = {
  title: string;
  nextTitle: string | null;
  pointsToNext: number | null;
};

// Carte réutilisée sur l'accueil, le profil et l'écran classement — le
// titre pédagogique est cumulatif (profiles.points_total), pas lié à une
// période, donc identique partout où elle est affichée.
export function TitleProgressCard({ title, nextTitle, pointsToNext }: TitleProgressCardProps) {
  return (
    <Card>
      <Text style={[typography.small, styles.label]}>Ton titre actuel</Text>
      <Text style={[typography.h3, styles.title]}>{title}</Text>
      {nextTitle && pointsToNext !== null ? (
        <Text style={[typography.body, styles.next]}>
          Encore {pointsToNext} points pour devenir {nextTitle}.
        </Text>
      ) : (
        <Text style={[typography.body, styles.next]}>
          Tu as atteint le titre le plus élevé. Continue pour le conserver !
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.mutedText,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.darkText,
    marginBottom: spacing.xs,
  },
  next: {
    color: colors.mutedText,
  },
});
