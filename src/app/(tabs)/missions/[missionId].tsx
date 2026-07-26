import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Screen, StateView } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { type Mission, completeMission, getMissions } from '@/lib/missionsApi';

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'not_found' }
  | { status: 'ready'; mission: Mission; checked: boolean; submitting: boolean }
  | { status: 'confirmed'; mission: Mission; pointsAwarded: number };

// Écran 17 — pas de GET /missions/:id dédié : la liste (déjà chargée par
// l'écran 16) contient toutes les données nécessaires (titre, description,
// points, statut), donc on la refetch et on filtre par id plutôt que
// d'ajouter un endpoint redondant.
export default function MissionDetailScreen() {
  const { token } = useAuth();
  const { missionId } = useLocalSearchParams<{ missionId: string }>();
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    if (!token) return;
    setState({ status: 'loading' });
    try {
      const missions = await getMissions(token);
      const mission = missions.find((m) => m.id === missionId);
      if (!mission) {
        setState({ status: 'not_found' });
        return;
      }
      if (mission.status === 'completed') {
        setState({ status: 'confirmed', mission, pointsAwarded: 0 });
        return;
      }
      setState({ status: 'ready', mission, checked: false, submitting: false });
    } catch {
      setState({ status: 'error' });
    }
  }, [token, missionId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleValidate() {
    if (state.status !== 'ready' || !token) return;
    setState({ ...state, submitting: true });
    try {
      const result = await completeMission(token, state.mission.id);
      setState({ status: 'confirmed', mission: state.mission, pointsAwarded: result.points_awarded });
    } catch {
      setState({ ...state, submitting: false });
    }
  }

  if (state.status === 'loading') {
    return (
      <Screen mode="normal" scroll>
        <StateView state="loading" skeletonCount={2} />
      </Screen>
    );
  }

  if (state.status === 'error') {
    return (
      <Screen mode="normal" scroll>
        <StateView state="error" message="Le chargement de la mission a échoué." onRetry={load} />
      </Screen>
    );
  }

  if (state.status === 'not_found') {
    return (
      <Screen mode="normal" scroll>
        <StateView
          state="empty"
          title="Mission introuvable"
          message="Cette mission n'existe plus ou a été retirée."
          actionLabel="Retour aux missions"
          onAction={() => router.replace('/(tabs)/missions')}
        />
      </Screen>
    );
  }

  if (state.status === 'confirmed') {
    return (
      <Screen mode="normal" scroll>
        <Text style={[typography.h2, styles.spaced]}>{state.mission.title}</Text>
        <View style={styles.confirmBlock}>
          <Text style={[typography.bodyBold, styles.confirmText]}>Mission validée !</Text>
          <Text style={[typography.body, styles.confirmText]}>
            {state.pointsAwarded > 0
              ? `+${state.pointsAwarded} points ajoutés à votre profil.`
              : 'Cette mission fait déjà partie de votre passeport.'}
          </Text>
        </View>
        <PrimaryButton label="Retour aux missions" onPress={() => router.replace('/(tabs)/missions')} style={styles.spaced} />
      </Screen>
    );
  }

  const { mission, checked, submitting } = state;

  return (
    <Screen mode="normal" scroll>
      <Text style={[typography.h2, styles.spaced]}>{mission.title}</Text>

      <View style={styles.spaced}>
        <Text style={[typography.body, styles.bullet]}>• {mission.description}</Text>
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={() => setState({ ...state, checked: !checked })}
        style={styles.checkRow}>
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </View>
        <Text style={[typography.body, styles.checkText]}>J'ai réalisé cette mission.</Text>
      </Pressable>

      <PrimaryButton
        label={submitting ? 'Validation...' : `Valider (+${mission.points_reward} pts)`}
        onPress={handleValidate}
        loading={submitting}
        disabled={!checked}
        style={styles.spaced}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  spaced: {
    marginTop: spacing.lg,
  },
  bullet: {
    color: colors.darkText,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
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
  confirmText: {
    color: colors.successGreen,
  },
});
