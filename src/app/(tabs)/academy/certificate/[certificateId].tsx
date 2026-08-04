import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ChevronStrip, OutlineButton, PrimaryButton, ResponsibilityNote, Screen, StateView } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { type Certificate, getCertificate } from '@/lib/certificatesApi';
import { shareMessage } from '@/lib/share';

// Écran 10 — attestation pédagogique.
export default function CertificateScreen() {
  const { token } = useAuth();
  const { certificateId } = useLocalSearchParams<{ certificateId: string }>();
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error' } | { status: 'success'; certificate: Certificate }
  >({ status: 'loading' });

  const load = useCallback(async () => {
    if (!token || !certificateId) return;
    setState({ status: 'loading' });
    try {
      const certificate = await getCertificate(token, certificateId);
      setState({ status: 'success', certificate });
    } catch {
      setState({ status: 'error' });
    }
  }, [token, certificateId]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      <Screen mode="normal" scroll>
        <StateView state="loading" />
      </Screen>
    );
  }
  if (state.status === 'error') {
    return (
      <Screen mode="normal" scroll>
        <StateView state="error" message="Le chargement de l'attestation a échoué." onRetry={load} />
      </Screen>
    );
  }

  const { certificate } = state;

  return (
    <Screen mode="normal" scroll>
      <View style={styles.document}>
        <ChevronStrip />
        <View style={styles.documentBody}>
          <Text style={[typography.small, styles.whiteMuted, styles.centerText]}>
            Attestation pédagogique AFRICASECOUR
          </Text>
          <Text style={[typography.h1, styles.whiteText, styles.centerText, styles.spaced]}>
            {certificate.course_title}
          </Text>
          <Text style={[typography.data, styles.whiteText, styles.centerText, styles.spaced]}>
            Score : {certificate.score}%
          </Text>
          <Text style={[typography.data, styles.whiteMuted, styles.centerText]}>
            N° {certificate.certificate_number}
          </Text>
          <Text style={[typography.small, styles.whiteMuted, styles.centerText, styles.spaced]}>
            Délivrée le {new Date(certificate.issued_at).toLocaleDateString('fr-FR')}
          </Text>
        </View>
        <ChevronStrip />
      </View>

      <View style={styles.spaced}>
        <ResponsibilityNote text="Cette attestation AFRICASECOUR est un document pédagogique. Elle ne remplace pas une certification officielle délivrée par un organisme habilité." />
      </View>

      <PrimaryButton
        label="Partager"
        onPress={() =>
          shareMessage(
            `J'ai obtenu l'attestation "${certificate.course_title}" (${certificate.score}%) sur AFRICASECOUR — N° ${certificate.certificate_number}.`,
          )
        }
        style={styles.spaced}
      />
      {/* Écran Passeport livré en Vague 7 — action inerte pour l'instant. */}
      <OutlineButton label="Ajouter au Passeport" onPress={() => {}} disabled style={styles.spaced} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  document: {
    marginTop: spacing.lg,
  },
  documentBody: {
    backgroundColor: colors.darkText,
    padding: spacing.lg,
  },
  whiteText: {
    color: colors.white,
  },
  whiteMuted: {
    color: colors.stressSubtext,
  },
  centerText: {
    textAlign: 'center',
  },
  spaced: {
    marginTop: spacing.md,
  },
});
