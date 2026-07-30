import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, ResponsibilityNote, Screen } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';

type BadgeParams = {
  courseId: string;
  title: string;
  description: string;
};

// Écran "Badge obtenu" — atteint juste après la complétion de mission qui
// déclenche le badge (params transmis directement par l'appelant, pas de
// nouvelle requête réseau, comme le quiz le fait déjà vers l'écran
// certificat), et consultable ensuite à tout moment pour révision depuis
// l'écran détail du cours.
export default function BadgeAwardedScreen() {
  const { title, description } = useLocalSearchParams<BadgeParams>();

  return (
    <Screen mode="normal" scroll>
      <View style={styles.iconBlock}>
        <Text style={styles.icon}>🏅</Text>
      </View>
      <Text style={[typography.h2, styles.centerText, styles.spaced]}>{title}</Text>
      <Text style={[typography.body, styles.centerText, styles.spaced]}>{description}</Text>

      <ResponsibilityNote text="Ce badge AFRICASECOUR est un élément de progression pédagogique. Il ne remplace pas une certification officielle délivrée par un organisme habilité." />

      <PrimaryButton label="Voir mon Passeport" onPress={() => router.push('/passport')} style={styles.spaced} />
      <PrimaryButton label="Retour au cours" onPress={() => router.back()} variant="brand" style={styles.spaced} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconBlock: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  icon: {
    fontSize: 64,
  },
  spaced: {
    marginTop: spacing.lg,
  },
  centerText: {
    textAlign: 'center',
  },
});
