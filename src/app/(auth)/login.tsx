import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { PrimaryButton, Screen, TextField } from '@/components/ui';
import { spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { login } from '@/lib/authApi';

// Fonctionnel minimal (Phase 0.8) — POST /auth/login réel, suffisant pour
// obtenir un utilisateur de test et atteindre les tabs. Le design
// pixel-perfect (écran 03 : œil mot de passe, "Consignes sans compte"...)
// arrive en Vague 4, sans changer cette logique de soumission.
export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      const { token } = await login(email, password);
      await signIn(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de se connecter pour le moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen mode="normal">
      <Text style={[typography.h2, styles.spaced]}>Connexion</Text>
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={styles.spaced}
      />
      <TextField
        label="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={error ?? undefined}
        style={styles.spaced}
      />
      <PrimaryButton
        label={isSubmitting ? 'Connexion...' : 'Se connecter'}
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!email || !password}
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
