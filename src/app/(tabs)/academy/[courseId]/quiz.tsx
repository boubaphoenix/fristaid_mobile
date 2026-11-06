import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OutlineButton, PrimaryButton, ProgressSegments, Screen, StateView } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { enqueueOfflineAction, isNetworkError } from '@/lib/offlineQueue';
import { getQuiz, submitQuiz, type QuizQuestion, type QuizSubmitResult } from '@/lib/quizApi';
import { isValidRecordId } from '@/lib/routeParams';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
// Même seuil que le backend (fristaid-backend/src/routes/quiz.ts) — utilisé
// seulement pour le résultat provisoire hors-ligne, le serveur recalcule.
const PASS_THRESHOLD_PERCENT = 70;

// Écrans 08 (question) + 09 (résultat) — une seule question à la fois,
// explication affichée immédiatement après la réponse (sans aller-retour
// réseau : GET /courses/:id/quiz fournit déjà is_correct + explanation).
export default function QuizScreen() {
  const { token } = useAuth();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();

  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error' } | { status: 'success'; quiz: QuizQuestion[] }
  >({ status: 'loading' });
  const [qIndex, setQIndex] = useState(0);
  const [selectedByQuiz, setSelectedByQuiz] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isOfflineResult, setIsOfflineResult] = useState(false);

  const load = useCallback(async () => {
    if (!token || !courseId) return;
    if (!isValidRecordId(courseId)) {
      setState({ status: 'error' });
      return;
    }
    setState({ status: 'loading' });
    setQIndex(0);
    setSelectedByQuiz({});
    setResult(null);
    setIsOfflineResult(false);
    try {
      const quiz = await getQuiz(token, courseId);
      setState({ status: 'success', quiz });
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
        <StateView state="error" message="Le chargement du quiz a échoué." onRetry={load} />
      </Screen>
    );
  }

  const { quiz } = state;

  if (result) {
    const passed = result.passed;
    return (
      <Screen mode="normal" scroll>
        <View style={styles.resultCentered}>
          <Text style={[typography.scoreDisplay, { color: passed ? colors.successGreen : colors.warningOrange }]}>
            {result.score_percent}%
          </Text>
          <Text style={[typography.h2, styles.centerText]}>
            {passed ? 'Quiz réussi !' : 'Pas encore réussi'}
          </Text>
          <Text style={[typography.body, styles.muted, styles.centerText]}>
            {isOfflineResult
              ? 'Résultat provisoire calculé sur votre téléphone — score minimum requis : 70%.'
              : `Meilleur score : ${result.quiz_best_score}% — score minimum requis : 70%.`}
          </Text>
        </View>

        {isOfflineResult ? (
          <View style={[styles.explanationBlock, styles.spaced]}>
            <Text style={typography.small}>
              Vous êtes hors-ligne : vos réponses sont enregistrées sur l'appareil et seront envoyées
              automatiquement au retour du réseau. Vos points et votre attestation arriveront à ce moment-là.
            </Text>
          </View>
        ) : null}

        {isOfflineResult && passed ? null : passed && result.certificate ? (
          <PrimaryButton
            label="Voir mon attestation"
            onPress={() =>
              router.push({
                pathname: '/(tabs)/academy/certificate/[certificateId]',
                params: { certificateId: result.certificate!.id },
              })
            }
            variant="success"
            style={styles.spaced}
          />
        ) : (
          <PrimaryButton label="Réessayer le quiz" onPress={load} style={styles.spaced} />
        )}
        <OutlineButton
          label="Retour au cours"
          onPress={() => router.back()}
          style={styles.spaced}
        />
      </Screen>
    );
  }

  const question = quiz[qIndex]!;
  const selectedOptionId = selectedByQuiz[question.id];
  const hasAnswered = Boolean(selectedOptionId);
  const isLastQuestion = qIndex === quiz.length - 1;

  async function handleNext() {
    if (isLastQuestion) {
      if (!token || !courseId) return;
      setIsSubmitting(true);
      setSubmitError(null);
      const answers = quiz.map((q) => ({ quiz_id: q.id, option_id: selectedByQuiz[q.id]! }));
      try {
        const submitResult = await submitQuiz(token, courseId, answers);
        setResult(submitResult);
      } catch (err) {
        if (isNetworkError(err)) {
          // Hors-ligne : les bonnes réponses sont déjà sur l'appareil (GET
          // quiz), le score provisoire est donc calculable ici ; le serveur
          // fera foi à l'envoi (voir offlineQueue.ts).
          const correctCount = quiz.filter(
            (q) => q.options.find((o) => o.id === selectedByQuiz[q.id])?.is_correct,
          ).length;
          const scorePercent = Math.round((correctCount / quiz.length) * 100);
          await enqueueOfflineAction({ kind: 'quiz', courseId, answers, createdAt: Date.now() });
          setIsOfflineResult(true);
          setResult({
            score_percent: scorePercent,
            passed: scorePercent >= PASS_THRESHOLD_PERCENT,
            quiz_best_score: scorePercent,
            certificate: null,
          });
          return;
        }
        setSubmitError(
          err instanceof ApiError ? err.message : "Impossible d'envoyer vos réponses pour le moment.",
        );
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setQIndex((i) => i + 1);
    }
  }

  return (
    <Screen mode="normal" scroll>
      <View style={styles.progress}>
        <Text style={[typography.data, styles.muted]}>
          Question {qIndex + 1}/{quiz.length}
        </Text>
        <ProgressSegments count={qIndex + 1} total={quiz.length} />
      </View>

      <Text style={[typography.h2, styles.spaced]}>{question.question}</Text>

      <View style={styles.spaced}>
        {question.options.map((option, i) => {
          const isSelected = selectedOptionId === option.id;
          const showCorrectness = hasAnswered;
          const isCorrectOption = option.is_correct;

          return (
            <Pressable
              key={option.id}
              disabled={hasAnswered}
              onPress={() => setSelectedByQuiz((prev) => ({ ...prev, [question.id]: option.id }))}
              style={[
                styles.option,
                isSelected && !showCorrectness && styles.optionSelected,
                showCorrectness && isCorrectOption && styles.optionCorrect,
                showCorrectness && isSelected && !isCorrectOption && styles.optionIncorrect,
              ]}>
              <Text style={[typography.data, styles.optionLetter]}>{OPTION_LETTERS[i]}</Text>
              <Text style={[typography.body, styles.optionLabel]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {hasAnswered ? (
        <View style={styles.explanationBlock}>
          <Text style={typography.small}>{question.explanation}</Text>
        </View>
      ) : null}

      <PrimaryButton
        label={isLastQuestion ? 'Voir mon résultat' : 'Question suivante'}
        onPress={handleNext}
        disabled={!hasAnswered}
        loading={isSubmitting}
        style={styles.spaced}
      />
      {submitError ? <Text style={[typography.small, styles.errorText, styles.spaced]}>{submitError}</Text> : null}
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
  errorText: {
    color: colors.emergencyRed,
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
  optionCorrect: {
    borderColor: colors.successGreen,
    borderWidth: 2,
    backgroundColor: colors.successBg,
  },
  optionIncorrect: {
    borderColor: colors.warningOrange,
    borderWidth: 2,
    backgroundColor: colors.warningBg,
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
    marginTop: spacing.sm,
  },
  resultCentered: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  centerText: {
    textAlign: 'center',
  },
});
