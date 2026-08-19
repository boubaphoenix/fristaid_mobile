import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, OutlineButton, PointsBadge, PrimaryButton, ProgressSegments, Screen, StateView } from '@/components/ui';
import { CHALLENGE_IMAGES } from '@/constants/challengeImages';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import {
  getCurrentWeeklyChallenge,
  submitWeeklyChallengeAttempt,
  type WeeklyChallenge,
  type WeeklyChallengeAnswer,
} from '@/lib/weeklyChallengeApi';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'already_attempted'; challenge: WeeklyChallenge }
  | { status: 'ready'; challenge: WeeklyChallenge };

type SubmitResult = { is_correct: boolean | null; points_awarded: number; explanation: string | null };

// Écran unique pour les 6 formats de défi hebdomadaire — le rendu de la
// zone de réponse est choisi selon `challenge.type`, mais le chargement,
// la soumission et l'écran de résultat sont communs à tous les formats.
export default function WeeklyChallengeScreen() {
  const { token } = useAuth();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Réponse en cours de saisie, forme dépend de `challenge.type`.
  const [boolValue, setBoolValue] = useState<boolean | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [actionChecked, setActionChecked] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setState({ status: 'loading' });
    setResult(null);
    setBoolValue(null);
    setSelectedOption(null);
    setStepIndex(0);
    setSelectedOptions([]);
    setActionChecked(false);
    setSubmitError(null);
    try {
      const { challenge, alreadyAttempted } = await getCurrentWeeklyChallenge(token);
      if (!challenge) {
        setState({ status: 'empty' });
      } else if (alreadyAttempted) {
        setState({ status: 'already_attempted', challenge });
      } else {
        setState({ status: 'ready', challenge });
      }
    } catch {
      setState({ status: 'error' });
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(answer: WeeklyChallengeAnswer) {
    if (state.status !== 'ready' || !token) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const submitResult = await submitWeeklyChallengeAttempt(token, state.challenge.id, answer);
      setResult(submitResult);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Une erreur inattendue s'est produite.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
        <StateView state="error" message="Le chargement du défi de la semaine a échoué." onRetry={load} />
      </Screen>
    );
  }

  if (state.status === 'empty') {
    return (
      <Screen mode="normal" scroll>
        <StateView
          state="empty"
          title="Pas de défi cette semaine"
          message="Reviens un peu plus tard, un nouveau défi arrive bientôt."
          actionLabel="Retour à l'accueil"
          onAction={() => router.replace('/(tabs)')}
        />
      </Screen>
    );
  }

  if (state.status === 'already_attempted') {
    const { challenge } = state;
    return (
      <Screen mode="normal" scroll>
        <Text style={[typography.h2, styles.spaced]}>{challenge.title}</Text>
        <View style={styles.confirmBlock}>
          <Text style={[typography.bodyBold, styles.confirmText]}>Tu as déjà répondu à ce défi cette semaine.</Text>
          <Text style={[typography.body, styles.confirmText]}>Reviens la semaine prochaine pour un nouveau défi.</Text>
        </View>
        <PrimaryButton label="Retour à l'accueil" onPress={() => router.replace('/(tabs)')} style={styles.spaced} />
      </Screen>
    );
  }

  const { challenge } = state;

  if (result) {
    const course = challenge.course;
    const isWrong = result.is_correct === false;
    const bannerText =
      result.is_correct === null
        ? 'Défi validé !'
        : result.is_correct
          ? challenge.type === 'simulation'
            ? challenge.content.success_message
            : 'Bonne réponse !'
          : 'Pas tout à fait.';
    return (
      <Screen mode="normal" scroll>
        <Text style={[typography.h2, styles.spaced]}>{challenge.title}</Text>
        <View
          style={[
            styles.confirmBlock,
            isWrong ? styles.confirmBlockWarning : undefined,
          ]}>
          <Text
            style={[
              typography.bodyBold,
              isWrong ? styles.warningText : styles.confirmText,
            ]}>
            {bannerText}
          </Text>
          {result.explanation ? (
            <Text style={[typography.body, styles.explanationText]}>{result.explanation}</Text>
          ) : null}
          {result.points_awarded > 0 ? (
            <View style={styles.spacedSmall}>
              <PointsBadge value={result.points_awarded} size="large" />
            </View>
          ) : null}
        </View>

        {course ? (
          isWrong ? (
            <OutlineButton
              label={`Revoir le cours : ${course.title}`}
              onPress={() => router.push({ pathname: '/(tabs)/academy/[courseId]', params: { courseId: course.id } })}
              style={styles.spaced}
            />
          ) : (
            <Pressable
              onPress={() => router.push({ pathname: '/(tabs)/academy/[courseId]', params: { courseId: course.id } })}
              style={styles.discreetLink}>
              <Text style={[typography.data, styles.discreetLinkText]}>Revoir le cours</Text>
            </Pressable>
          )
        ) : null}

        <PrimaryButton label="Retour à l'accueil" onPress={() => router.replace('/(tabs)')} style={styles.spaced} />
      </Screen>
    );
  }

  return (
    <Screen mode="normal" scroll>
      <Text style={[typography.h2, styles.spaced]}>{challenge.title}</Text>
      <Text style={[typography.body, styles.muted, styles.spacedSmall]}>{challenge.description}</Text>

      {renderAnswerZone()}

      {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
    </Screen>
  );

  function renderAnswerZone() {
    switch (challenge.type) {
      case 'true_false':
      case 'reminder':
      case 'seasonal':
        return (
          <View style={styles.spaced}>
            {challenge.type === 'reminder' ? (
              <Text style={styles.reminderIntro}>{challenge.content.intro_phrase}</Text>
            ) : null}
            {challenge.type === 'seasonal' ? (
              <View style={styles.seasonalBlock}>
                <Text style={styles.seasonalContext}>{challenge.content.context_sentence}</Text>
                <Text style={styles.seasonalFact}>{challenge.content.fact_sentence}</Text>
              </View>
            ) : null}
            <Card>
              <Text style={typography.body}>{challenge.content.statement}</Text>
            </Card>
            <View style={styles.trueFalseRow}>
              <PrimaryButton
                label="Vrai"
                onPress={() => {
                  setBoolValue(true);
                  submit({ value: true });
                }}
                variant="success"
                loading={isSubmitting && boolValue === true}
                disabled={isSubmitting}
                style={styles.trueFalseButton}
              />
              <PrimaryButton
                label="Faux"
                onPress={() => {
                  setBoolValue(false);
                  submit({ value: false });
                }}
                variant="danger"
                loading={isSubmitting && boolValue === false}
                disabled={isSubmitting}
                style={styles.trueFalseButton}
              />
            </View>
          </View>
        );

      case 'visual_recognition': {
        const imageSource = CHALLENGE_IMAGES[challenge.content.image_key];
        return (
          <View style={styles.spaced}>
            {imageSource ? (
              <Image source={imageSource} style={styles.image} contentFit="cover" accessibilityLabel={challenge.content.question} />
            ) : null}
            <Text style={[typography.bodyBold, styles.spacedSmall]}>{challenge.content.question}</Text>
            {challenge.content.mode === 'true_false' ? (
              <View style={styles.trueFalseRow}>
                <PrimaryButton label="Vrai" onPress={() => submit({ value: true })} variant="success" disabled={isSubmitting} style={styles.trueFalseButton} />
                <PrimaryButton label="Faux" onPress={() => submit({ value: false })} variant="danger" disabled={isSubmitting} style={styles.trueFalseButton} />
              </View>
            ) : (
              <View style={styles.spacedSmall}>
                {(challenge.content.options ?? []).map((option, i) => (
                  <Pressable
                    key={option}
                    disabled={isSubmitting}
                    onPress={() => {
                      setSelectedOption(i);
                      submit({ selected_option: i });
                    }}
                    style={[styles.option, selectedOption === i && styles.optionSelected]}>
                    <Text style={[typography.data, styles.optionLetter]}>{OPTION_LETTERS[i]}</Text>
                    <Text style={[typography.body, styles.optionLabel]}>{option}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        );
      }

      case 'simulation': {
        const step = challenge.content.steps[stepIndex]!;
        const isLastStep = stepIndex === challenge.content.steps.length - 1;
        return (
          <View style={styles.spaced}>
            <Text style={[typography.data, styles.muted]}>
              Étape {stepIndex + 1}/{challenge.content.steps.length}
            </Text>
            <ProgressSegments count={stepIndex + 1} total={challenge.content.steps.length} />
            <Card style={styles.spacedSmall}>
              <Text style={typography.body}>{challenge.content.scenario}</Text>
            </Card>
            <Text style={[typography.bodyBold, styles.spacedSmall]}>{step.question}</Text>
            <View style={styles.spacedSmall}>
              {step.options.map((option, i) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    const next = [...selectedOptions];
                    next[stepIndex] = i;
                    setSelectedOptions(next);
                    if (isLastStep) {
                      submit({ selected_options: next });
                    } else {
                      setStepIndex((n) => n + 1);
                    }
                  }}
                  style={styles.option}>
                  <Text style={[typography.data, styles.optionLetter]}>{OPTION_LETTERS[i]}</Text>
                  <Text style={[typography.body, styles.optionLabel]}>{option}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      }

      case 'real_action':
        return (
          <View style={styles.spaced}>
            <Card>
              <Text style={typography.body}>{challenge.content.instructions}</Text>
            </Card>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: actionChecked }}
              onPress={() => setActionChecked((c) => !c)}
              style={styles.checkRow}>
              <View style={[styles.checkbox, actionChecked && styles.checkboxChecked]}>
                {actionChecked ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
              <Text style={[typography.body, styles.checkText]}>J'ai réalisé cette action.</Text>
            </Pressable>
            <PrimaryButton
              label="Valider"
              onPress={() => submit({ completed: true })}
              disabled={!actionChecked || isSubmitting}
              loading={isSubmitting}
              style={styles.spacedSmall}
            />
          </View>
        );

      default:
        return null;
    }
  }
}

const styles = StyleSheet.create({
  spaced: {
    marginTop: spacing.lg,
  },
  spacedSmall: {
    marginTop: spacing.sm,
  },
  muted: {
    color: colors.mutedText,
  },
  trueFalseRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  trueFalseButton: {
    flex: 1,
  },
  reminderIntro: {
    ...typography.body,
    fontStyle: 'italic',
    color: colors.trustBlue,
    backgroundColor: colors.trustBg,
    borderRadius: radius.card,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  seasonalBlock: {
    backgroundColor: colors.warningBg,
    borderRadius: radius.card,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  seasonalContext: {
    ...typography.body,
    color: colors.darkText,
  },
  seasonalFact: {
    ...typography.bodyBold,
    color: colors.warningOrange,
  },
  image: {
    aspectRatio: 4 / 3,
    width: '100%',
    borderRadius: radius.card,
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
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.trustBlue,
    borderColor: colors.trustBlue,
  },
  checkboxMark: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 18,
  },
  checkText: {
    flex: 1,
    color: colors.darkText,
  },
  confirmBlock: {
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successGreen,
    borderRadius: radius.card,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  confirmBlockWarning: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningOrange,
  },
  confirmText: {
    color: colors.successGreen,
  },
  warningText: {
    color: colors.darkText,
  },
  explanationText: {
    color: colors.darkText,
    marginTop: spacing.xs,
  },
  discreetLink: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  discreetLinkText: {
    color: colors.mutedText,
    textDecorationLine: 'underline',
  },
  errorText: {
    color: colors.emergencyRed,
    marginTop: spacing.md,
  },
});
