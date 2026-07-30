import { StyleSheet, Text, View } from 'react-native';

import { Card } from './Card';
import { colors, spacing, typography } from '@/constants/theme';

type PathwayStepperProps = {
  videoAvailable: boolean;
  lessonsCompleted: boolean;
  quizPassed: boolean;
  simulationPassed: boolean;
  missionCompleted: boolean;
  badgeAwarded: boolean;
};

type StepState = 'done' | 'active' | 'locked';

function stepState(done: boolean, unlocked: boolean): StepState {
  if (done) return 'done';
  if (unlocked) return 'active';
  return 'locked';
}

const STATE_ICON: Record<StepState, string> = { done: '✅', active: '⏳', locked: '🔒' };

// Résumé compact du parcours complet d'un cours — sérieux et sobre (pas
// d'animation, pas de couleurs vives supplémentaires), cohérent avec le
// ton "secourisme responsable" de l'app.
export function PathwayStepper(props: PathwayStepperProps) {
  const steps: { label: string; state: StepState }[] = [
    { label: 'Vidéo disponible', state: stepState(props.videoAvailable, true) },
    { label: 'Leçons terminées', state: stepState(props.lessonsCompleted, true) },
    { label: 'Quiz réussi', state: stepState(props.quizPassed, props.lessonsCompleted) },
    { label: 'Simulation réussie', state: stepState(props.simulationPassed, props.quizPassed) },
    { label: 'Mission validée', state: stepState(props.missionCompleted, props.simulationPassed) },
    { label: 'Badge obtenu', state: stepState(props.badgeAwarded, props.missionCompleted) },
  ];

  return (
    <Card>
      <Text style={[typography.bodyBold, styles.title]}>Votre parcours</Text>
      {steps.map((step) => (
        <View key={step.label} style={styles.row}>
          <Text style={styles.icon}>{STATE_ICON[step.state]}</Text>
          <Text style={[typography.body, styles.label, step.state === 'locked' && styles.locked]}>{step.label}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  icon: {
    fontSize: 16,
    width: 24,
  },
  label: {
    flex: 1,
    color: colors.darkText,
  },
  locked: {
    color: colors.mutedText,
  },
});
