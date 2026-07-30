import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OutlineButton, PrimaryButton, ProgressSegments, Screen, StateView } from '@/components/ui';
import { colors, fonts, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  getSimulation,
  submitSimulation,
  type Simulation,
  type SimulationStep,
  type SimulationSubmitResult,
} from '@/lib/simulationsApi';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

// Étape "Simulation" du parcours — une question à la fois comme le quiz,
// mais la correction n'arrive qu'à la soumission finale (le GET ne
// renvoie pas correct_option/explanation, contrairement au quiz qui est
// pédagogique dès la première réponse). Garde la tension du scénario.
export default function SimulationScreen() {
  const { token } = useAuth();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();

  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'success'; simulation: Simulation; steps: SimulationStep[] }
  >({ status: 'loading' });
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedByStep, setSelectedByStep] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SimulationSubmitResult | null>(null);

  const load = useCallback(async () => {
    if (!token || !courseId) return;
    setState({ status: 'loading' });
    setStepIndex(0);
    setSelectedByStep({});
    setResult(null);
    try {
      const { simulation, steps } = await getSimulation(token, courseId);
      setState({ status: 'success', simulation, steps });
    } catch {
      setState({ status: 'error' });
    }
  }, [token, courseId]);

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
        <StateView state="error" message="Le chargement de la simulation a échoué." onRetry={load} />
      </Screen>
    );
  }

  const { simulation, steps } = state;

  if (result) {
    const explanationByStep = new Map(result.steps.map((s) => [s.step_id, s]));
    return (
      <Screen mode="normal" scroll>
        <View style={styles.resultCentered}>
          <Text style={[styles.scoreText, { color: result.passed ? colors.successGreen : colors.warningOrange }]}>
            {result.score_percent}%
          </Text>
          <Text style={[typography.h2, styles.centerText]}>
            {result.passed ? 'Simulation réussie !' : 'Pas encore réussie'}
          </Text>
          <Text style={[typography.body, styles.muted, styles.centerText]}>
            Score minimum requis : {result.passing_score}%.
          </Text>
        </View>

        <View style={styles.spaced}>
          {steps.map((step, i) => {
            const detail = explanationByStep.get(step.id);
            if (!detail) return null;
            return (
              <View key={step.id} style={styles.explanationBlock}>
                <Text style={[typography.bodyBold, styles.spaced]}>{step.question}</Text>
                <Text style={[typography.data, styles.muted]}>
                  Bonne réponse : {OPTION_LETTERS[detail.correct_option]} — {step.options[detail.correct_option]}
                </Text>
                <Text style={typography.small}>{detail.explanation}</Text>
              </View>
            );
          })}
        </View>

        {result.passed ? (
          <PrimaryButton
            label="Continuer vers la mission"
            onPress={() => router.push('/(tabs)/missions')}
            variant="success"
            style={styles.spaced}
          />
        ) : (
          <PrimaryButton label="Réessayer la simulation" onPress={load} style={styles.spaced} />
        )}
        <OutlineButton label="Retour au cours" onPress={() => router.back()} style={styles.spaced} />
      </Screen>
    );
  }

  const step = steps[stepIndex]!;
  const selectedOption = selectedByStep[step.id];
  const hasAnswered = selectedOption !== undefined;
  const isLastStep = stepIndex === steps.length - 1;

  async function handleNext() {
    if (isLastStep) {
      if (!token || !courseId) return;
      setIsSubmitting(true);
      try {
        const answers = steps.map((s) => ({ step_id: s.id, selected_option: selectedByStep[s.id]! }));
        const submitResult = await submitSimulation(token, courseId, answers);
        if (submitResult.badge) {
          router.replace({
            pathname: '/(tabs)/academy/[courseId]/badge',
            params: {
              courseId: submitResult.badge.course_id,
              title: submitResult.badge.title,
              description: submitResult.badge.description,
            },
          });
          return;
        }
        setResult(submitResult);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  return (
    <Screen mode="normal" scroll>
      <View style={styles.progress}>
        <Text style={[typography.data, styles.muted]}>
          Étape {stepIndex + 1}/{steps.length}
        </Text>
        <ProgressSegments count={stepIndex + 1} total={steps.length} />
      </View>

      {stepIndex === 0 ? (
        <View style={styles.scenarioBlock}>
          <Text style={[typography.bodyBold, styles.spaced]}>{simulation.title}</Text>
          <Text style={typography.body}>{simulation.scenario}</Text>
        </View>
      ) : null}

      <Text style={[typography.h2, styles.spaced]}>{step.question}</Text>

      <View style={styles.spaced}>
        {step.options.map((option, i) => {
          const isSelected = selectedOption === i;
          return (
            <Pressable
              key={i}
              disabled={hasAnswered}
              onPress={() => setSelectedByStep((prev) => ({ ...prev, [step.id]: i }))}
              style={[styles.option, isSelected && styles.optionSelected]}>
              <Text style={[typography.data, styles.optionLetter]}>{OPTION_LETTERS[i]}</Text>
              <Text style={[typography.body, styles.optionLabel]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton
        label={isLastStep ? 'Voir mon résultat' : 'Étape suivante'}
        onPress={handleNext}
        disabled={!hasAnswered}
        loading={isSubmitting}
        style={styles.spaced}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: {
    marginTop: spacing.md,
  },
  muted: {
    color: colors.mutedText,
    marginBottom: spacing.xs,
  },
  spaced: {
    marginTop: spacing.lg,
  },
  scenarioBlock: {
    backgroundColor: colors.lightGray,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 64,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  optionSelected: {
    borderColor: colors.trustBlue,
    borderWidth: 2,
  },
  optionLetter: {
    color: colors.trustBlue,
  },
  optionLabel: {
    flex: 1,
  },
  explanationBlock: {
    backgroundColor: colors.lightGray,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  resultCentered: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  scoreText: {
    fontFamily: fonts.monoBold,
    fontSize: 64,
  },
  centerText: {
    textAlign: 'center',
  },
});
