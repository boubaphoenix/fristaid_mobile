import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Screen } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getPaymentStatus, initiatePayment, type PaymentStatusValue } from '@/lib/paymentsApi';

const POLL_INTERVAL_MS = 1500;

// Écran 21 — paiement et confirmation, 3 états sur un seul écran. Le
// mobile ne décide jamais qu'une commande est payée : il initie puis
// interroge GET /payments/:orderId/status jusqu'à résolution côté serveur.
export default function PaymentScreen() {
  const { token } = useAuth();
  const { orderId, phone } = useLocalSearchParams<{ orderId: string; phone: string }>();
  const [status, setStatus] = useState<PaymentStatusValue | 'starting'>('starting');
  const [pointsAwarded, setPointsAwarded] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (!token || !orderId || !phone) return;
    stopPolling();
    setStatus('starting');
    try {
      await initiatePayment(token, orderId, phone);
      setStatus('processing');
      pollRef.current = setInterval(async () => {
        try {
          const result = await getPaymentStatus(token, orderId);
          if (result.status !== 'processing') {
            stopPolling();
            if (result.status === 'paid') setPointsAwarded(50);
            setStatus(result.status);
          }
        } catch {
          // Erreur réseau ponctuelle pendant le polling : on continue
          // d'essayer plutôt que d'afficher un échec non confirmé par le serveur.
        }
      }, POLL_INTERVAL_MS);
    } catch {
      setStatus('failed');
    }
  }, [token, orderId, phone, stopPolling]);

  useEffect(() => {
    start();
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'starting' || status === 'processing' || status === 'pending') {
    return (
      <Screen mode="normal">
        <View style={styles.centered}>
          <View style={styles.pulseDot} />
          <Text style={[typography.h2, styles.centerText]}>Paiement en cours…</Text>
          <Text style={[typography.body, styles.muted, styles.centerText]}>
            Confirmez l'opération sur votre téléphone si une demande apparaît.
          </Text>
        </View>
      </Screen>
    );
  }

  if (status === 'paid') {
    return (
      <Screen mode="normal">
        <View style={styles.centered}>
          <View style={styles.successBlock}>
            <Text style={[typography.h2, styles.successText]}>Paiement confirmé !</Text>
            {pointsAwarded ? (
              <Text style={[typography.body, styles.successText]}>+{pointsAwarded} points ajoutés à votre profil.</Text>
            ) : null}
          </View>
          <PrimaryButton label="Retour à l'accueil" onPress={() => router.replace('/(tabs)')} style={styles.spaced} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen mode="normal">
      <View style={styles.centered}>
        <View style={styles.failureBlock}>
          <Text style={[typography.h2, styles.failureText]}>Le paiement a échoué</Text>
          <Text style={[typography.body, styles.failureText]}>
            Vérifiez votre solde ou réessayez avec un autre moyen de paiement.
          </Text>
        </View>
        <PrimaryButton label="Réessayer" onPress={start} style={styles.spaced} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  centerText: {
    textAlign: 'center',
  },
  muted: {
    color: colors.mutedText,
  },
  pulseDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.trustBlue,
    marginBottom: spacing.sm,
  },
  successBlock: {
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successGreen,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.xs,
    alignItems: 'center',
  },
  successText: {
    color: colors.successGreen,
    textAlign: 'center',
  },
  failureBlock: {
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningOrange,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.xs,
    alignItems: 'center',
  },
  failureText: {
    color: colors.darkText,
    textAlign: 'center',
  },
  spaced: {
    marginTop: spacing.lg,
  },
});
