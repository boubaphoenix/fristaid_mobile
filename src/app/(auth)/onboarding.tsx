import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OutlineButton, PrimaryButton, ProgressSegments, ResponsibilityNote, Screen } from '@/components/ui';
import { brand, colors, spacing, typography } from '@/constants/theme';
import { markOnboardingSeen } from '@/lib/onboardingStorage';

// Écran 01 — carousel 3 slides, statique (aucune donnée réseau). Le flag
// onboarding_seen (voir onboardingStorage.ts) est posé une fois cet écran
// quitté (Passer, ou dernier slide) pour ne jamais le rejouer (index.tsx
// s'appuie dessus pour décider de la route de démarrage).
type Slide = { title: string; body: string };

const SLIDES: Slide[] = [
  {
    title: 'Apprenez les gestes qui sauvent',
    body: "Des formations courtes, conçues pour être suivies n'importe où, même avec une connexion limitée.",
  },
  {
    title: "Une IA pour vous guider en urgence",
    body: 'En situation réelle, AFRICASECOUR vous accompagne pas à pas selon la situation et votre rôle.',
  },
  {
    title: 'Progressez et obtenez vos attestations',
    body: 'Gagnez des points, validez des quiz, et suivez votre parcours dans votre passeport secouriste.',
  },
];

export default function OnboardingScreen() {
  const [slideIndex, setSlideIndex] = useState(0);
  const isLastSlide = slideIndex === SLIDES.length - 1;
  const slide = SLIDES[slideIndex];

  async function finishOnboarding(destination: '/(auth)/register' | '/(auth)/login') {
    await markOnboardingSeen();
    router.replace(destination);
  }

  return (
    <Screen mode="normal" backgroundColor={brand.cream}>
      <View style={styles.header}>
        <View style={styles.progress}>
          <ProgressSegments count={slideIndex + 1} total={SLIDES.length} activeColor={brand.terracotta} />
        </View>
        {isLastSlide ? null : (
          <Pressable accessibilityRole="button" onPress={() => finishOnboarding('/(auth)/login')} hitSlop={8}>
            <Text style={[typography.bodyBold, styles.skip]}>Passer</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.slideBody}>
        <Text style={[typography.h1, styles.spaced]}>{slide.title}</Text>
        <Text style={[typography.body, styles.muted]}>{slide.body}</Text>
      </View>

      <View style={styles.actions}>
        {isLastSlide ? (
          <>
            <PrimaryButton
              label="Créer un compte"
              onPress={() => finishOnboarding('/(auth)/register')}
              style={styles.spaced}
            />
            <OutlineButton
              label="J'ai déjà un compte"
              onPress={() => finishOnboarding('/(auth)/login')}
              style={styles.spaced}
            />
          </>
        ) : (
          <PrimaryButton label="Suivant" onPress={() => setSlideIndex((i) => i + 1)} style={styles.spaced} />
        )}

        <ResponsibilityNote text="AFRICASECOUR forme aux gestes de premiers secours. Cela ne remplace jamais un avis médical ni l'appel aux secours." />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  progress: {
    flex: 1,
  },
  skip: {
    color: brand.terracotta,
  },
  slideBody: {
    flex: 1,
    justifyContent: 'center',
  },
  spaced: {
    marginBottom: spacing.md,
  },
  muted: {
    color: colors.mutedText,
  },
  actions: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
});
