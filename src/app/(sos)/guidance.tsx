import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { CourseType } from '@/components/ui/CourseIcon';
import { EmergencyBanner, OutlineButton, PrimaryButton, ProgressSegments, Screen } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { confirmAlert } from '@/lib/confirmAlert';
import { buildEmergencyMessage, LOCATION_SHARE_COPY, requestAndGetCurrentPosition } from '@/lib/location';
import { shareMessage } from '@/lib/share';
import { generateSosInstructions, startSosSession, type SosAnswers, type SosInstructions, type SosRole } from '@/lib/sosApi';

const NON_ANSWER_PARAM_KEYS = new Set(['role', 'incident']);

// Toutes les questions (écran 13) transmettent leur réponse en 'true' |
// 'false' | 'unknown' via l'URL — on reconstitue les booléens ici, le
// reste (ex. 'unknown') reste une chaîne, acceptée par le backend.
function parseAnswersFromParams(params: Record<string, string | string[] | undefined>): SosAnswers {
  const answers: SosAnswers = {};
  for (const [key, value] of Object.entries(params)) {
    if (NON_ANSWER_PARAM_KEYS.has(key) || typeof value !== 'string') continue;
    answers[key] = value === 'true' ? true : value === 'false' ? false : value;
  }
  return answers;
}

// Consignes minimales, jamais vides, si l'API est injoignable (pas de
// réseau / backend indisponible) — distinct du cas "quota atteint", que
// le backend gère déjà en renvoyant un contenu statique utilisable.
const OFFLINE_FALLBACK_STEPS = [
  'Restez avec la personne.',
  'Appelez les secours dès que possible.',
  'Suivez leurs consignes au téléphone.',
];

export default function SosGuidanceScreen() {
  const { token } = useAuth();
  // Écrans 11-13 (collecte rôle/incident/réponses) livrés en Vague 2 — en
  // attendant, cet écran accepte les mêmes paramètres en query string pour
  // être testé en isolation (voir plan Vague 1, remarque écran 14).
  const params = useLocalSearchParams<{ role?: string; incident?: string }>();
  const role = (params.role as SosRole | undefined) ?? 'witness';
  const incidentType = (params.incident as CourseType | undefined) ?? 'bleeding';

  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'offline' }
    | { status: 'success'; instructions: SosInstructions }
  >({ status: 'loading' });
  const [stepIndex, setStepIndex] = useState(0);
  const [showCannotDoWarning, setShowCannotDoWarning] = useState(false);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setState({ status: 'loading' });
    setStepIndex(0);
    setShowCannotDoWarning(false);
    try {
      const answers = parseAnswersFromParams(params);
      await startSosSession(token);
      const { instructions } = await generateSosInstructions(token, role, incidentType, answers);
      setState({ status: 'success', instructions });
    } catch {
      setState({ status: 'offline' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role, incidentType]);

  useEffect(() => {
    load();
  }, [load]);

  // Confirmation obligatoire avant tout partage — jamais d'envoi
  // automatique. La demande de permission de localisation n'a lieu que
  // dans shareLocationNow, uniquement après ce tap explicite.
  function handleShareLocation() {
    setShareFeedback(null);
    confirmAlert(LOCATION_SHARE_COPY.confirmTitle, LOCATION_SHARE_COPY.confirmMessage, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Continuer', onPress: shareLocationNow },
    ]);
  }

  async function shareLocationNow() {
    setIsSharingLocation(true);
    try {
      const result = await requestAndGetCurrentPosition();
      if (result.status === 'denied') {
        confirmAlert(LOCATION_SHARE_COPY.permissionDeniedTitle, LOCATION_SHARE_COPY.permissionDenied);
        return;
      }
      if (result.status === 'unavailable') {
        confirmAlert(LOCATION_SHARE_COPY.positionUnavailableTitle, LOCATION_SHARE_COPY.positionUnavailable);
        return;
      }
      const message = buildEmergencyMessage(result.latitude, result.longitude, 'long');
      const outcome = await shareMessage(message);
      if (outcome === 'cancelled') {
        setShareFeedback(LOCATION_SHARE_COPY.shareCancelled);
      }
    } finally {
      setIsSharingLocation(false);
    }
  }

  if (state.status === 'loading') {
    return (
      <Screen mode="stress" scroll>
        <EmergencyBanner phoneNumber="185" />
        <View style={styles.centered}>
          <Text style={[typography.h2, styles.whiteText]}>Préparation des consignes…</Text>
        </View>
      </Screen>
    );
  }

  if (state.status === 'offline') {
    return (
      <Screen mode="stress" scroll>
        <EmergencyBanner phoneNumber="185" />
        <View style={styles.spaced}>
          {OFFLINE_FALLBACK_STEPS.map((step) => (
            <Text key={step} style={[typography.body, styles.whiteText, styles.spaced]}>
              {step}
            </Text>
          ))}
        </View>
        <PrimaryButton label="Réessayer" onPress={load} stress style={styles.spaced} />
        <OutlineButton label="Fermer" onPress={() => router.back()} stress variant="danger" style={styles.spaced} />
      </Screen>
    );
  }

  const { instructions } = state;
  const isLastStep = stepIndex === instructions.steps.length - 1;
  const currentStep = instructions.steps[stepIndex];

  return (
    <Screen mode="stress" scroll>
      <EmergencyBanner phoneNumber="185" />

      <View style={styles.spaced}>
        <Text style={[typography.data, styles.stepLabel]}>
          Étape {stepIndex + 1}/{instructions.steps.length}
        </Text>
        <ProgressSegments count={stepIndex + 1} total={instructions.steps.length} />
      </View>

      <Text style={[typography.h1, styles.whiteText, styles.spaced]}>{currentStep}</Text>

      {showCannotDoWarning ? (
        <View style={styles.warningBlock}>
          <Text style={[typography.bodyBold, styles.warningText]}>{instructions.emergencyReminder}</Text>
          {instructions.doNotDo.map((item) => (
            <Text key={item} style={[typography.small, styles.warningText]}>
              • {item}
            </Text>
          ))}
        </View>
      ) : null}

      {isLastStep && showCannotDoWarning === false ? (
        <Text style={[typography.body, styles.whiteText, styles.spaced]}>
          Dernière étape. Continuez de suivre les consignes des secours jusqu'à leur arrivée.
        </Text>
      ) : null}

      <PrimaryButton
        label={isLastStep ? 'Terminer' : "C'est fait"}
        onPress={() => (isLastStep ? router.replace('/(tabs)') : setStepIndex((i) => i + 1))}
        stress
        variant="success"
        style={styles.spaced}
      />
      <OutlineButton
        label="Je n'y arrive pas"
        onPress={() => setShowCannotDoWarning(true)}
        stress
        style={styles.spaced}
      />
      <OutlineButton
        label="Partager ma position"
        onPress={handleShareLocation}
        stress
        variant="brand"
        disabled={isSharingLocation}
        style={styles.spaced}
      />
      {shareFeedback ? (
        <Text style={[typography.small, styles.whiteText, styles.spaced]}>{shareFeedback}</Text>
      ) : null}
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
  stepLabel: {
    color: colors.stressSubtext,
    marginBottom: spacing.xs,
  },
  warningBlock: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningOrange,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  warningText: {
    color: colors.white,
  },
});
