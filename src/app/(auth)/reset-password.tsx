import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LogoMark, PrimaryButton, Screen, TextField } from '@/components/ui';
import { spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { confirmPasswordReset } from '@/lib/authApi';

// Étape 2 du parcours mot de passe oublié — succès identique au chemin de
// connexion classique (signIn + entrée directe dans l'app).
export default function ResetPasswordScreen() {
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = Boolean(email && code.length === 6 && newPassword.length >= 8) && !isSubmitting;

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      const { token } = await confirmPasswordReset(email, code, newPassword);
      await signIn(token);
      router.replace('/post-auth-loading');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de réinitialiser le mot de passe pour le moment.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen mode="normal" scroll keyboardAvoiding>
      <View style={styles.logoHeader}>
        <LogoMark size={48} variant="onCream" />
      </View>
      <Text style={[typography.h2, styles.spaced]}>Nouveau mot de passe</Text>

      <TextField label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" style={styles.spaced} />
      <TextField
        label="Code reçu par e-mail"
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        style={styles.spaced}
      />
      <TextField
        label="Nouveau mot de passe"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        error={error ?? undefined}
        style={styles.spaced}
      />

      <PrimaryButton
        label={isSubmitting ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!canSubmit}
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
});
