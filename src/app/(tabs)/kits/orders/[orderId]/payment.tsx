import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { OutlineButton, PrimaryButton, Screen } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getPaymentStatus, initiatePayment, type PaymentStatusValue } from '@/lib/paymentsApi';
import { isValidRecordId } from '@/lib/routeParams';

const POLL_INTERVAL_MS = 1500;

// Écran 21 — paiement et confirmation, 3 états sur un seul écran. Le
// mobile ne décide jamais qu'une commande est payée : il initie puis
// interroge GET /payments/:orderId/status jusqu'à résolution côté serveur.
export default function PaymentScreen() {
  const { token } = useAuth();
  const { orderId, phone, amount } = useLocalSearchParams<{ orderId: string; phone: string; amount?: string }>();
  const [status, setStatus] = useState<PaymentStatusValue | 'starting' | 'confirm'>('confirm');
  const [pointsAwarded, setPointsAwarded] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (!token || !orderId || !phone || !isValidRecordId(orderId)) return;
    stopPolling();
    setStatus('starting');
    try {
      const initiated = await initiatePayment(token, orderId, phone);
      if (initiated.checkout_url) {
        // Checkout hébergée Bictorys : on ouvre la page de paiement dans un
        // navigateur intégré. Le retour (succès ou échec) redirige vers un
        // lien fristaidmobile:// configuré côté serveur (voir
        // successRedirectUrl/errorRedirectUrl dans services/payments.ts) ;
        // le résultat renvoyé ici n'est qu'une indication UX pour fermer le
        // navigateur — seul le polling ci-dessous, backé par
        // GET /payments/:orderId/status, confirme réellement le paiement.
        await WebBrowser.openAuthSessionAsync(initiated.checkout_url, 'fristaidmobile://');
      }
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

  useEffect(() => stopPolling, [stopPolling]);

  if (!isValidRecordId(orderId) || !phone) {
    return (
      <Screen mode="normal">
        <View style={styles.centered}>
          <Text style={[typography.h2, styles.centerText]}>Lien de paiement invalide</Text>
          <Text style={[typography.body, styles.muted, styles.centerText]}>
            Ce lien de paiement est incomplet ou invalide.
          </Text>
          <PrimaryButton label="Retour aux kits" onPress={() => router.replace('/(tabs)/kits')} style={styles.spaced} />
        </View>
      </Screen>
    );
  }

  if (status === 'confirm') {
    const amountLabel = amount ? `${Number(amount).toLocaleString('fr-FR')} FCFA` : 'Le montant de votre commande';
    return (
      <Screen mode="normal">
        <View style={styles.centered}>
          <Text style={[typography.h2, styles.centerText]}>Confirmer le paiement</Text>
          <Text style={[typography.body, styles.muted, styles.centerText]}>
            {amountLabel} {amount ? 'seront demandés' : 'sera demandé'} sur la page de paiement sécurisée.
          </Text>
          <PrimaryButton label="Confirmer le paiement" onPress={start} style={styles.spaced} />
          <OutlineButton label="Annuler" onPress={() => router.back()} style={styles.spaced} />
        </View>
      </Screen>
    );
  }

  if (status === 'starting' || status === 'processing' || status === 'pending') {
    return (
      <Screen mode="normal">
        <View style={styles.centered}>
          <View style={styles.pulseDot} />
          <Text style={[typography.h2, styles.centerText]}>Paiement en cours…</Text>
          <Text style={[typography.body, styles.muted, styles.centerText]}>
            Nous confirmons votre paiement, merci de patienter quelques instants.
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
