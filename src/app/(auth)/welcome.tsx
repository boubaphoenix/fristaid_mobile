import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoLockup, PrimaryButton } from '@/components/ui';
import { brand, colors, spacing, typography } from '@/constants/theme';
import { markOnboardingSeen } from '@/lib/onboardingStorage';

// Écran 00 — nouveau point d'entrée (planche de marque). index.tsx route
// ici pour tout utilisateur non connecté n'ayant pas encore vu
// l'onboarding, à la place d'un accès direct au carousel.
export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <LogoLockup markSize={112} wordmarkSize={30} variant="onForest" />
          <Text style={[typography.body, styles.pitch]}>
            La formation aux gestes qui sauvent, et une IA pour vous guider en
            situation d'urgence.
          </Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label="Commencer"
            variant="brand"
            onPress={() => router.push('/(auth)/onboarding')}
            style={styles.primaryButton}
          />
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              await markOnboardingSeen();
              router.replace('/(auth)/login');
            }}
            hitSlop={8}>
            <Text style={[typography.bodyBold, styles.loginLink]}>J'ai déjà un compte</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: brand.forest,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  pitch: {
    color: colors.white,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  actions: {
    marginBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  primaryButton: {
    width: '100%',
  },
  loginLink: {
    color: colors.white,
  },
});
