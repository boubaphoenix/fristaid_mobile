import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OutlineButton, PrimaryButton, Screen, StateView, TextField } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { confirmEmailVerification, fetchMe, requestEmailVerification, type AuthUser } from '@/lib/authApi';

const RESEND_COOLDOWN_SECONDS = 30;

// Écran atteint uniquement depuis Profil (même patron que identity-card.tsx :
// pas de Stack dédié, simple bouton retour). Statut informatif uniquement —
// ne bloque jamais l'accès au reste de l'app (voir plan Resend).
export default function VerifyEmailScreen() {
  const { token } = useAuth();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error' } | { status: 'success'; user: AuthUser }>(
    { status: 'loading' },
  );
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  function load() {
    if (!token) return;
    setState({ status: 'loading' });
    fetchMe(token)
      .then((user) => setState({ status: 'success', user }))
      .catch(() => setState({ status: 'error' }));
  }

  useEffect(load, [token]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  async function handleConfirm() {
    if (!token) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const { user } = await confirmEmailVerification(token, code);
      setState({ status: 'success', user });
      setCode('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de vérifier ce code pour le moment.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!token) return;
    setFeedback(null);
    setError(null);
    setIsResending(true);
    try {
      await requestEmailVerification(token);
      setFeedback('Un nouveau code vient de vous être envoyé par e-mail.');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'envoyer un code pour le moment.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <Screen mode="normal" scroll keyboardAvoiding>
      <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8} style={styles.backLink}>
        <Text style={[typography.bodyBold, styles.backLabel]}>← Retour</Text>
      </Pressable>

      <Text style={[typography.h2, styles.spaced]}>Vérification de l'e-mail</Text>

      {state.status === 'loading' ? <StateView state="loading" /> : null}
      {state.status === 'error' ? (
        <StateView state="error" message="Le chargement du statut a échoué." onRetry={load} />
      ) : null}

      {state.status === 'success' && state.user.email_verified ? (
        <View style={styles.spaced}>
          <Text style={[typography.body, styles.successText]}>✓ Votre e-mail {state.user.email} est vérifié.</Text>
        </View>
      ) : null}

      {state.status === 'success' && !state.user.email_verified ? (
        <View style={styles.spaced}>
          <Text style={[typography.body, styles.muted]}>
            Entrez le code à 6 chiffres envoyé à {state.user.email}.
          </Text>
          <TextField
            label="Code de vérification"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            error={error ?? undefined}
            style={styles.spaced}
          />
          <PrimaryButton
            label={isSubmitting ? 'Vérification...' : 'Vérifier'}
            onPress={handleConfirm}
            loading={isSubmitting}
            disabled={code.length !== 6 || isSubmitting}
            style={styles.spaced}
          />
          <OutlineButton
            label={
              isResending
                ? 'Envoi...'
                : resendCooldown > 0
                  ? `Renvoyer le code (${resendCooldown}s)`
                  : 'Renvoyer le code'
            }
            onPress={handleResend}
            disabled={isResending || resendCooldown > 0}
            style={styles.spaced}
          />
          {feedback ? <Text style={[typography.small, styles.muted, styles.spaced]}>{feedback}</Text> : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backLink: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  backLabel: {
    color: colors.trustBlue,
  },
  spaced: {
    marginTop: spacing.lg,
  },
  muted: {
    color: colors.mutedText,
  },
  successText: {
    color: colors.successGreen,
  },
});
