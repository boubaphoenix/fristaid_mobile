import { Link, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GoogleButton, LogoMark, OutlineButton, PrimaryButton, Screen, TextField } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { login, signInWithGoogle } from '@/lib/authApi';
import { useGoogleSignIn } from '@/lib/googleAuth';

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
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

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

  const { promptAsync, isReady } = useGoogleSignIn(
    async (idToken) => {
      setGoogleError(null);
      setIsGoogleSubmitting(true);
      try {
        const { token } = await signInWithGoogle(idToken);
        await signIn(token);
        router.replace('/post-auth-loading');
      } catch (err) {
        setGoogleError(
          err instanceof ApiError ? err.message : 'Impossible de se connecter avec Google pour le moment.',
        );
      } finally {
        setIsGoogleSubmitting(false);
      }
    },
    (message) => setGoogleError(message),
  );

  return (
    <Screen mode="normal" scroll keyboardAvoiding>
      <View style={styles.logoHeader}>
        <LogoMark size={48} variant="onCream" />
      </View>
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

      <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
        <Text style={[typography.small, styles.mutedLink]}>Mot de passe oublié ?</Text>
      </Link>

      <PrimaryButton
        label={isSubmitting ? 'Connexion...' : 'Se connecter'}
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!email || !password || isGoogleSubmitting}
        style={styles.spaced}
      />
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={[typography.small, styles.dividerText]}>ou</Text>
        <View style={styles.dividerLine} />
      </View>
      <GoogleButton
        onPress={promptAsync}
        disabled={!isReady || isSubmitting || isGoogleSubmitting}
      />
      <Text style={[typography.caption, styles.mutedLink, styles.googleDisclaimer]}>
        En continuant avec Google, vous acceptez les Conditions Générales d'Utilisation
        d'AFRICASECOUR.
      </Text>
      {googleError ? (
        <Text style={[typography.small, styles.googleError, styles.spaced]}>{googleError}</Text>
      ) : null}
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
  logoHeader: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.mutedText,
  },
  googleError: {
    color: colors.emergencyRed,
  },
  googleDisclaimer: {
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
});
