import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { PrimaryButton, Screen, TextField } from '@/components/ui';
import { spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { registerAccount } from '@/lib/authApi';

// Fonctionnel minimal (Phase 0.8) — POST /auth/register réel. Le design
// pixel-perfect (écran 02 : indicateur de robustesse, case CGU...) arrive
// en Vague 4, sans changer cette logique de soumission.
export default function RegisterScreen() {
  const { signIn } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      const { token } = await registerAccount(email, password, fullName || undefined);
      await signIn(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de créer le compte pour le moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen mode="normal">
      <Text style={[typography.h2, styles.spaced]}>Inscription</Text>
      <TextField label="Nom complet" value={fullName} onChangeText={setFullName} style={styles.spaced} />
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
        label={isSubmitting ? 'Création...' : 'Créer mon compte'}
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!email || !password}
        style={styles.spaced}
      />
      <Link href="/(auth)/login">
        <Text style={typography.bodyBold}>J'ai déjà un compte</Text>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  spaced: {
    marginBottom: spacing.md,
  },
});
