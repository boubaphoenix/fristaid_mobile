import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { OutlineButton, PrimaryButton, Screen, TextField } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { login } from '@/lib/authApi';

// Écran 03 — logique déjà fonctionnelle depuis la Phase 0.8
// (POST /auth/login réel) ; cette version ajoute l'habillage Banani
// ("Consignes sans compte" vers l'écran d'urgence sans auth) sans changer
// la soumission.
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
      router.replace('/post-auth-loading');
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

      {/* Mot de passe oublié hors périmètre MVP (§8.2) : lien inerte assumé, pas de fausse promesse de flux fonctionnel. */}
      <Pressable disabled accessibilityRole="link" style={styles.forgotLink}>
        <Text style={[typography.small, styles.mutedLink]}>Mot de passe oublié ?</Text>
      </Pressable>

      <PrimaryButton
        label={isSubmitting ? 'Connexion...' : 'Se connecter'}
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!email || !password}
        style={styles.spaced}
      />
      <Link href="/(auth)/register">
        <Text style={[typography.bodyBold, styles.spaced]}>Créer un compte</Text>
      </Link>

      <OutlineButton
        label="Consignes sans compte"
        onPress={() => router.push('/(auth)/emergency-guide')}
        variant="danger"
        style={styles.spaced}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  spaced: {
    marginBottom: spacing.md,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
  },
  mutedLink: {
    color: colors.mutedText,
  },
});
