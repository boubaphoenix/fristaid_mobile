import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EmergencyBanner, OutlineButton, PrimaryButton, ProgressSegments, Screen } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { INCIDENTS, ROLES, type IncidentType } from '@/constants/sosContent';
import { useAuth } from '@/context/AuthContext';
import { useEmergencyContacts } from '@/context/EmergencyContactsContext';
import { confirmAlert } from '@/lib/confirmAlert';
import { buildEmergencyMessage, LOCATION_SHARE_COPY, requestAndGetCurrentPosition } from '@/lib/location';
import { isOneOf } from '@/lib/routeParams';
import { shareMessage } from '@/lib/share';
import { generateSosInstructions, startSosSession, type SosAnswers, type SosInstructions, type SosRole } from '@/lib/sosApi';

const ROLE_VALUES = ROLES.map((r) => r.value);
const INCIDENT_VALUES = INCIDENTS.map((i) => i.value);

const NON_ANSWER_PARAM_KEYS = new Set(['role', 'incident']);

const DEFAULT_PROLONGED_WAIT_MINUTES = 15;

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
  const { samuNumber } = useEmergencyContacts();
  // Écrans 11-13 (collecte rôle/incident/réponses) livrés en Vague 2 — en
  // attendant, cet écran accepte les mêmes paramètres en query string pour
  // être testé en isolation (voir plan Vague 1, remarque écran 14).
  const params = useLocalSearchParams<{ role?: string; incident?: string }>();
  const role: SosRole = isOneOf(params.role, ROLE_VALUES) ? params.role : 'witness';
  const incidentType: IncidentType = isOneOf(params.incident, INCIDENT_VALUES) ? params.incident : 'bleeding';

  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'offline' }
    | { status: 'success'; instructions: SosInstructions; sessionId: string }
  >({ status: 'loading' });
  const [stepIndex, setStepIndex] = useState(0);
  const [showCannotDoWarning, setShowCannotDoWarning] = useState(false);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // v1.1, protocole d'attente prolongée (3bis) — double déclenchement :
  // seuil configurable écoulé (minuteur, même patron que quota.tsx) ou
  // lien manuel toujours visible. `startedAt`/`thresholdMinutes` viennent
  // de /sos/start (aucun aller-retour réseau supplémentaire).
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [thresholdMinutes, setThresholdMinutes] = useState(DEFAULT_PROLONGED_WAIT_MINUTES);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedMinutes = startedAt ? (now - startedAt) / 60_000 : 0;
  const prolongedWaitThresholdReached = elapsedMinutes >= thresholdMinutes;

  const load = useCallback(async () => {
    if (!token) return;
    setState({ status: 'loading' });
    setStepIndex(0);
    setShowCannotDoWarning(false);
    try {
      const answers = parseAnswersFromParams(params);
      const started = await startSosSession(token);
      setStartedAt(Date.parse(started.started_at) || Date.now());
      setThresholdMinutes(started.prolonged_wait_threshold_minutes ?? DEFAULT_PROLONGED_WAIT_MINUTES);
      const { session_id, instructions } = await generateSosInstructions(token, role, incidentType, answers);
      setState({ status: 'success', instructions, sessionId: session_id });
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

  function goToProlongedWait(sessionId: string | null) {
    router.push({
      pathname: '/(sos)/prolonged-wait',
      params: { incident: incidentType, ...(sessionId ? { session_id: sessionId } : {}) },
    });
  }

  if (state.status === 'loading') {
    return (
      <Screen mode="stress" scroll>
        <EmergencyBanner phoneNumber={samuNumber} />
        <View style={styles.centered}>
          <Text style={[typography.h2, styles.whiteText]}>Préparation des consignes…</Text>
        </View>
      </Screen>
    );
  }

  if (state.status === 'offline') {
    return (
      <Screen mode="stress" scroll>
        <EmergencyBanner phoneNumber={samuNumber} />
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

  const { instructions, sessionId } = state;
  const isLastStep = stepIndex === instructions.steps.length - 1;
  const currentStep = instructions.steps[stepIndex];

  return (
    <Screen mode="stress" scroll>
      <EmergencyBanner phoneNumber={samuNumber} />

      <View style={styles.spaced}>
        <Text style={[typography.data, styles.stepLabel]}>
          Étape {stepIndex + 1}/{instructions.steps.length}
        </Text>
        <ProgressSegments count={stepIndex + 1} total={instructions.steps.length} />
      </View>

      <Text style={[typography.h1, styles.whiteText, styles.spaced]}>{currentStep}</Text>

      {instructions.aspirinOffered ? (
        <View style={styles.aspirinBlock}>
          <Text style={[typography.bodyBold, styles.aspirinText]}>
            Aspirine proposée : 300 mg à mâcher, jamais avalée entière, jamais au-delà de cette dose.
          </Text>
          <Text style={[typography.small, styles.aspirinText]}>
            Orientez la personne en urgence vers une structure de soins : l'aspirine ne remplace jamais l'évaluation
            médicale.
          </Text>
        </View>
      ) : null}

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

      {prolongedWaitThresholdReached ? (
        <View style={styles.prolongedWaitBanner}>
          <Text style={[typography.bodyBold, styles.warningText]}>Cela fait longtemps que vous attendez.</Text>
          <PrimaryButton
            label="Les secours tardent"
            onPress={() => goToProlongedWait(sessionId)}
            stress
            variant="danger"
            style={styles.spaced}
          />
        </View>
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

      <Text
        accessibilityRole="link"
        onPress={() => goToProlongedWait(sessionId)}
        style={[typography.small, styles.manualProlongedWaitLink]}>
        Ça fait longtemps que j'attends
      </Text>
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
  aspirinBlock: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningOrange,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  aspirinText: {
    color: colors.white,
  },
  prolongedWaitBanner: {
    backgroundColor: colors.emergencyBg,
    borderColor: colors.emergencyRed,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  manualProlongedWaitLink: {
    color: colors.stressSubtext,
    textAlign: 'center',
    marginTop: spacing.lg,
    textDecorationLine: 'underline',
  },
});
