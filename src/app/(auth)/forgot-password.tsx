import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LogoMark, PrimaryButton, Screen, TextField } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { requestPasswordReset } from '@/lib/authApi';

// Étape 1 du parcours mot de passe oublié — jamais de confirmation de
// l'existence du compte (voir POST /auth/password-reset/request, message
// générique quel que soit le résultat réel de la recherche côté serveur).
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
    } catch {
      // Volontairement ignoré : on affiche le même message générique même
      // en cas d'erreur réseau, pour ne jamais révéler d'information.
    } finally {
      setIsSubmitting(false);
      setSent(true);
    }
  }

  return (
    <Screen mode="normal" scroll keyboardAvoiding>
      <View style={styles.logoHeader}>
        <LogoMark size={48} variant="onCream" />
      </View>
      <Text style={[typography.h2, styles.spaced]}>Mot de passe oublié</Text>

      {!sent ? (
        <>
          <Text style={[typography.body, styles.muted, styles.spaced]}>
            Indiquez votre e-mail : si un compte existe, un code de réinitialisation vous sera envoyé.
          </Text>
          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            style={styles.spaced}
          />
          <PrimaryButton
            label={isSubmitting ? 'Envoi...' : 'Recevoir un code'}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!email || isSubmitting}
            style={styles.spaced}
          />
        </>
      ) : (
        <>
          <Text style={[typography.body, styles.spaced]}>
            Si un compte existe avec cet e-mail, un code de réinitialisation vient d'être envoyé.
          </Text>
          <PrimaryButton
            label="J'ai reçu mon code"
            onPress={() => router.push({ pathname: '/(auth)/reset-password', params: { email } })}
            style={styles.spaced}
          />
        </>
      )}
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
  muted: {
    color: '#6b7280',
  },
});
