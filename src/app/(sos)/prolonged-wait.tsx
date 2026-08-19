import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EmergencyBanner, OutlineButton, PrimaryButton, ProgressSegments, Screen } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { INCIDENTS, type IncidentType } from '@/constants/sosContent';
import { useAuth } from '@/context/AuthContext';
import { useEmergencyContacts } from '@/context/EmergencyContactsContext';
import { isOneOf } from '@/lib/routeParams';
import { checkProlongedWait, type ProlongedWaitOutcome } from '@/lib/sosApi';

const INCIDENT_VALUES = INCIDENTS.map((i) => i.value);

type AnswerValue = 'true' | 'false' | 'unknown';

// v1.1, section 3bis — protocole transversal d'attente prolongée. Les 2
// questions du document, plus une re-vérification fraîche des 3 signes
// graves incompatibles avec un transport (l'état de la personne peut
// avoir changé depuis le triage initial) : jamais réutilisées depuis la
// session d'origine, toujours reposées au moment T.
const PROLONGED_WAIT_QUESTIONS: { key: string; question: string }[] = [
  { key: 'help_still_coming', question: 'Les secours sont-ils toujours en route ?' },
  { key: 'transport_available', question: 'Avez-vous un moyen de transport disponible ?' },
  { key: 'no_breathing', question: 'La respiration est-elle absente ?' },
  { key: 'uncontrolled_bleeding', question: 'Y a-t-il un saignement non contrôlé ?' },
  { key: 'suspected_spine_injury', question: 'Une lésion de la colonne est-elle suspectée ?' },
];

// Écran d'attente prolongée — accessible depuis guidance.tsx par
// déclenchement automatique (seuil écoulé) ou lien manuel. Toujours
// statique côté serveur (/sos/prolonged-wait-check), jamais de
// cache/IA/quota : c'est un garde-fou de sécurité.
export default function SosProlongedWaitScreen() {
  const { token } = useAuth();
  const { samuNumber } = useEmergencyContacts();
  const params = useLocalSearchParams<{ incident?: string; session_id?: string }>();
  const incident: IncidentType = isOneOf(params.incident, INCIDENT_VALUES) ? params.incident : 'malaise';

  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [isChecking, setIsChecking] = useState(false);
  const [outcome, setOutcome] = useState<ProlongedWaitOutcome | null>(null);

  async function finalize(finalAnswers: Record<string, AnswerValue>) {
    if (!token) return;
    setIsChecking(true);
    try {
      const { outcome: result } = await checkProlongedWait(token, {
        session_id: params.session_id,
        incident_type: incident,
        help_still_coming: finalAnswers.help_still_coming ?? 'unknown',
        transport_available: finalAnswers.transport_available ?? 'unknown',
        no_breathing: finalAnswers.no_breathing ?? 'unknown',
        uncontrolled_bleeding: finalAnswers.uncontrolled_bleeding ?? 'unknown',
        suspected_spine_injury: finalAnswers.suspected_spine_injury ?? 'unknown',
      });
      setOutcome(result);
    } catch {
      // Jamais bloquer : repli sur le message le plus prudent (rester,
      // continuer les gestes) si l'API est injoignable.
      setOutcome({
        transportAdvised: false,
        steps: [
          'Continuez à attendre les secours et à suivre leurs consignes au téléphone.',
          'Restez avec la personne, rassurez-la.',
        ],
        doNotDo: [],
      });
    } finally {
      setIsChecking(false);
    }
  }

  function answer(value: AnswerValue) {
    const key = PROLONGED_WAIT_QUESTIONS[qIndex]!.key;
    const nextAnswers = { ...answers, [key]: value };
    if (qIndex >= PROLONGED_WAIT_QUESTIONS.length - 1) {
      finalize(nextAnswers);
    } else {
      setAnswers(nextAnswers);
      setQIndex((i) => i + 1);
    }
  }

  if (outcome) {
    return (
      <Screen mode="stress" scroll>
        <EmergencyBanner phoneNumber={samuNumber} />
        <View style={styles.spaced}>
          {outcome.steps.map((step) => (
            <Text key={step} style={[typography.body, styles.whiteText, styles.spaced]}>
              {step}
            </Text>
          ))}
        </View>
        {outcome.doNotDo.length > 0 ? (
          <View style={styles.warningBlock}>
            {outcome.doNotDo.map((item) => (
              <Text key={item} style={[typography.small, styles.warningText]}>
                • {item}
              </Text>
            ))}
          </View>
        ) : null}
        <PrimaryButton
          label="Retour aux consignes"
          onPress={() => router.back()}
          stress
          variant="success"
          style={styles.spaced}
        />
      </Screen>
    );
  }

  const currentQuestion = PROLONGED_WAIT_QUESTIONS[qIndex]!;

  return (
    <Screen mode="stress" scroll>
      <EmergencyBanner phoneNumber={samuNumber} />

      <View style={styles.progress}>
        <Text style={[typography.data, styles.stressSubtext]}>
          Question {qIndex + 1}/{PROLONGED_WAIT_QUESTIONS.length}
        </Text>
        <ProgressSegments count={qIndex + 1} total={PROLONGED_WAIT_QUESTIONS.length} />
      </View>

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
  question: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  spaced: {
    marginTop: spacing.md,
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
