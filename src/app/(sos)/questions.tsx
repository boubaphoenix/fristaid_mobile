import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EmergencyBanner, OutlineButton, PrimaryButton, ProgressSegments, Screen } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import {
  getNextMalaiseQuestion,
  INCIDENTS,
  QUESTIONS_BY_INCIDENT,
  ROLES,
  VITAL_INCIDENTS,
  type IncidentType,
  type SosQuestion,
} from '@/constants/sosContent';
import { useAuth } from '@/context/AuthContext';
import { useEmergencyContacts } from '@/context/EmergencyContactsContext';
import { isOneOf } from '@/lib/routeParams';
import { getSosQuota, type SosRole } from '@/lib/sosApi';

const ROLE_VALUES = ROLES.map((r) => r.value);
const INCIDENT_VALUES = INCIDENTS.map((i) => i.value);

type AnswerValue = 'true' | 'false' | 'unknown';

// Longueur estimée du sous-triage Malaise pour la barre de progression
// uniquement (3 tronc commun + jusqu'à 4 questions cause) — le
// sous-triage réel s'arrête souvent bien avant, voir getNextMalaiseQuestion.
const MALAISE_PROGRESS_ESTIMATE = 7;

function getNextQuestion(incident: IncidentType, answers: Record<string, AnswerValue>): SosQuestion | null {
  if (incident === 'malaise') return getNextMalaiseQuestion(answers);
  const list = QUESTIONS_BY_INCIDENT[incident] ?? [];
  return list.find((q) => !(q.key in answers)) ?? null;
}

// v1.1, section Malaise : "Un des signes du test FAST est-il présent ?
// → OUI : rediriger immédiatement vers le parcours AVC, ne pas
// continuer le sous-triage." Les 3 questions FAST partagent les mêmes
// clés entre malaise et avc (voir sosContent.ts), donc la bascule ne
// repose jamais une question déjà répondue.
function isMalaiseFastRedirectPending(incident: IncidentType, answers: Record<string, AnswerValue>): boolean {
  return (
    incident === 'malaise' &&
    'fast_face' in answers &&
    'fast_arm' in answers &&
    'fast_speech' in answers &&
    (answers.fast_face === 'true' || answers.fast_arm === 'true' || answers.fast_speech === 'true')
  );
}

function getProgress(incident: IncidentType, answers: Record<string, AnswerValue>) {
  if (incident === 'malaise') {
    const count = Math.min(Object.keys(answers).length + 1, MALAISE_PROGRESS_ESTIMATE);
    return { count, total: MALAISE_PROGRESS_ESTIMATE };
  }
  const list = QUESTIONS_BY_INCIDENT[incident] ?? [];
  const answeredInList = list.filter((q) => q.key in answers).length;
  return { count: Math.min(answeredInList + 1, list.length), total: list.length };
}

// Écran 13 — questions rapides (Mode Stress), une question par écran.
// "Je ne sais pas" est une réponse acceptée (PRD §11.7), jamais bloquante.
//
// v1.1 : seul le Malaise a des questions dynamiques (getNextQuestion
// délègue à getNextMalaiseQuestion) — tous les autres incidents
// gardent une liste fixe posée dans l'ordre, inchangé depuis v1.0.
export default function SosQuestionScreen() {
  const { token } = useAuth();
  const { samuNumber } = useEmergencyContacts();
  const params = useLocalSearchParams<{ role?: string; incident?: string }>();
  const role: SosRole = isOneOf(params.role, ROLE_VALUES) ? params.role : 'witness';
  const initialIncident: IncidentType = isOneOf(params.incident, INCIDENT_VALUES) ? params.incident : 'malaise';

  const [incident, setIncident] = useState<IncidentType>(initialIncident);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [isChecking, setIsChecking] = useState(false);
  const [redirectedFromMalaise, setRedirectedFromMalaise] = useState(false);
  const hasFinalizedRef = useRef(false);

  const currentQuestion = getNextQuestion(incident, answers);

  async function finalize(finalIncident: IncidentType, finalAnswers: Record<string, AnswerValue>) {
    if (hasFinalizedRef.current) return;
    hasFinalizedRef.current = true;
    const forwardParams: Record<string, string> = { role, incident: finalIncident, ...finalAnswers };

    if (VITAL_INCIDENTS.has(finalIncident) || !token) {
      router.replace({ pathname: '/(sos)/guidance', params: forwardParams });
      return;
    }

    setIsChecking(true);
    try {
      const quota = await getSosQuota(token);
      if (quota.remaining <= 0) {
        router.replace({ pathname: '/(sos)/quota', params: forwardParams });
      } else {
        router.replace({ pathname: '/(sos)/guidance', params: forwardParams });
      }
    } catch {
      // Vérification du quota indisponible : on continue quand même vers
      // le guidage plutôt que de bloquer l'utilisateur en situation d'urgence.
      router.replace({ pathname: '/(sos)/guidance', params: forwardParams });
    }
  }

  // Bascule malaise → AVC (redirection) ou finalisation, selon ce que
  // getNextQuestion a déterminé. useEffect (pas pendant le rendu) pour
  // que la mise à jour d'état reste correcte à chaque nouvelle réponse.
  useEffect(() => {
    if (currentQuestion) return;
    if (isMalaiseFastRedirectPending(incident, answers)) {
      setRedirectedFromMalaise(true);
      setIncident('avc');
      return;
    }
    finalize(incident, answers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, incident, answers]);

  function answer(value: AnswerValue) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.key]: value }));
  }

  if (!currentQuestion) {
    return (
      <Screen mode="stress" scroll>
        <EmergencyBanner phoneNumber={samuNumber} />
      </Screen>
    );
  }

  const { count, total } = getProgress(incident, answers);

  return (
    <Screen mode="stress" scroll>
      <EmergencyBanner phoneNumber={samuNumber} />

      <View style={styles.progress}>
        <Text style={[typography.data, styles.stressSubtext]}>
          Question {count}/{total}
        </Text>
        <ProgressSegments count={count} total={total} />
      </View>

      {redirectedFromMalaise && incident === 'avc' ? (
        <Text style={[typography.body, styles.redirectNotice]}>
          Vos réponses évoquent un possible AVC — on continue sur ce parcours.
        </Text>
      ) : null}

      <Text style={[typography.h1, styles.whiteText, styles.question]}>{currentQuestion.question}</Text>

      <PrimaryButton
        label={isChecking ? 'Vérification…' : 'Oui'}
        onPress={() => answer('true')}
        stress
        variant="success"
        disabled={isChecking}
        style={styles.spaced}
      />
      <PrimaryButton
        label="Non"
        onPress={() => answer('false')}
        stress
        variant="danger"
        disabled={isChecking}
        style={styles.spaced}
      />
      <OutlineButton
        label="Je ne sais pas"
        onPress={() => answer('unknown')}
        stress
        disabled={isChecking}
        style={styles.spaced}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: {
    marginTop: spacing.lg,
  },
  stressSubtext: {
    color: colors.stressSubtext,
    marginBottom: spacing.xs,
  },
  whiteText: {
    color: colors.white,
  },
  redirectNotice: {
    color: colors.emergencyRed,
    marginTop: spacing.md,
  },
  question: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  spaced: {
    marginTop: spacing.md,
  },
});
