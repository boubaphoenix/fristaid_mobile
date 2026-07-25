import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { PrimaryButton, Screen } from '@/components/ui';
import { spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

// Placeholder — formulaire réel + POST /auth/login livrés en Phase 0.8
// (fonctionnel) puis Vague 4 (design pixel-perfect, écran 03). Le bouton
// ci-dessous n'existe que pour vérifier la garde de navigation de la
// Phase 0.4 : il sera retiré dès que /auth/login existe réellement.
export default function LoginScreen() {
  const { signIn } = useAuth();

  return (
    <Screen mode="normal">
      <Text style={[typography.h2, styles.spaced]}>Connexion (placeholder)</Text>
      <Text style={[typography.body, styles.spaced]}>Formulaire détaillé en Vague 4.</Text>
      <PrimaryButton
        label="[Dev] Simuler une connexion"
        onPress={() => signIn('dev-token-phase-0-4')}
        style={styles.spaced}
      />
      <Link href="/(auth)/register">
        <Text style={typography.bodyBold}>Créer un compte</Text>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  spaced: {
    marginBottom: spacing.md,
  },
});
