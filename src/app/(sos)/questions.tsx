import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EmergencyBanner, OutlineButton, PrimaryButton, ProgressSegments, Screen } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { QUESTIONS_BY_INCIDENT, VITAL_INCIDENTS, type IncidentType } from '@/constants/sosContent';
import { useAuth } from '@/context/AuthContext';
import { getSosQuota, type SosRole } from '@/lib/sosApi';

type AnswerValue = 'true' | 'false' | 'unknown';

// Écran 13 — questions rapides (Mode Stress), une question par écran.
// "Je ne sais pas" est une réponse acceptée (PRD §11.7), jamais bloquante.
export default function SosQuestionScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{ role?: string; incident?: string }>();
  const role = (params.role as SosRole | undefined) ?? 'witness';
  const incident = (params.incident as IncidentType | undefined) ?? 'malaise';
  const questions = QUESTIONS_BY_INCIDENT[incident] ?? [];

  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [isChecking, setIsChecking] = useState(false);

  async function finalize(finalAnswers: Record<string, AnswerValue>) {
    const forwardParams: Record<string, string> = { role, incident, ...finalAnswers };

    if (VITAL_INCIDENTS.has(incident) || !token) {
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

  function answer(value: AnswerValue) {
    if (questions.length === 0) return;
    const key = questions[qIndex]!.key;
    const nextAnswers = { ...answers, [key]: value };
    if (qIndex >= questions.length - 1) {
      finalize(nextAnswers);
    } else {
      setAnswers(nextAnswers);
      setQIndex((i) => i + 1);
    }
  }

  // Filet de sécurité : chaque CourseType a des questions définies dans
  // QUESTIONS_BY_INCIDENT, donc cette branche ne devrait jamais s'exécuter.
  // useEffect (pas un appel pendant le rendu) pour rester correct si un
  // incident type sans questions apparaissait un jour.
  useEffect(() => {
    if (questions.length === 0) {
      finalize({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length]);

  if (questions.length === 0) {
    return (
      <Screen mode="stress" scroll>
        <EmergencyBanner phoneNumber="185" />
      </Screen>
    );
  }

  const currentQuestion = questions[qIndex]!;

  return (
    <Screen mode="stress" scroll>
      <EmergencyBanner phoneNumber="185" />

      <View style={styles.progress}>
        <Text style={[typography.data, styles.stressSubtext]}>
          Question {qIndex + 1}/{questions.length}
        </Text>
        <ProgressSegments count={qIndex + 1} total={questions.length} />
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
});
