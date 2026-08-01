import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EmergencyBanner, PrimaryButton, Screen, StateView } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getSosQuota, type SosQuota } from '@/lib/sosApi';

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Écran 15 — quota IA atteint. Les consignes statiques restent
// accessibles : ce n'est jamais une impasse, seulement une information.
export default function SosQuotaScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<Record<string, string>>();
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error' } | { status: 'success'; quota: SosQuota }
  >({ status: 'loading' });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!token) return;
    getSosQuota(token)
      .then((quota) => setState({ status: 'success', quota }))
      .catch(() => setState({ status: 'error' }));
  }, [token]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  function viewInstructions() {
    router.replace({ pathname: '/(sos)/guidance', params });
  }

  return (
    <Screen mode="stress" scroll>
      <EmergencyBanner phoneNumber="185" />

      {state.status === 'loading' ? (
        <View style={styles.centered}>
          <Text style={[typography.h2, styles.whiteText]}>Vérification du quota…</Text>
        </View>
      ) : state.status === 'error' ? (
        <View style={styles.spaced}>
          <StateView
            state="error"
            message="Impossible de vérifier le quota. Les consignes restent accessibles."
            onRetry={viewInstructions}
          />
        </View>
      ) : (
        <View style={styles.spaced}>
          <View style={styles.pictogram}>
            <View style={styles.pictogramInner} />
          </View>
          <Text style={[typography.h2, styles.whiteText, styles.centerText]}>
            Vous avez utilisé vos {state.quota.limit} sessions personnalisées gratuites du jour
          </Text>
          <Text style={[typography.body, styles.stressSubtext, styles.centerText, styles.spaced]}>
            Les consignes de sécurité restent accessibles gratuitement.
          </Text>
          <Text style={[typography.dataLarge, styles.whiteText, styles.centerText, styles.spaced]}>
            {formatCountdown(new Date(state.quota.resets_at).getTime() - now)}
          </Text>
          <Text style={[typography.small, styles.stressSubtext, styles.centerText]}>avant le renouvellement</Text>
        </View>
      )}

      <PrimaryButton label="Voir les consignes" onPress={viewInstructions} stress style={styles.spaced} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaced: {
    marginTop: spacing.lg,
  },
  whiteText: {
    color: colors.white,
  },
  stressSubtext: {
    color: colors.stressSubtext,
  },
  centerText: {
    textAlign: 'center',
  },
  pictogram: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: colors.stressSubtext,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  pictogramInner: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.stressSubtext,
  },
});
