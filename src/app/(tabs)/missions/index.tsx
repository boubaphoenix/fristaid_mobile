import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, ChevronStrip, PointsBadge, Screen, StateView } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getProfile } from '@/lib/profileApi';
import { type Mission, getMissions } from '@/lib/missionsApi';

type MissionsData = { pointsTotal: number; missions: Mission[] };

// Écran 16 — liste des missions.
export default function MissionsListScreen() {
  const { token } = useAuth();
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error' } | { status: 'success'; data: MissionsData }
  >({ status: 'loading' });

  const load = useCallback(async () => {
    if (!token) return;
    setState({ status: 'loading' });
    try {
      const [profile, missions] = await Promise.all([getProfile(token), getMissions(token)]);
      setState({ status: 'success', data: { pointsTotal: profile.profile.points_total, missions } });
    } catch {
      setState({ status: 'error' });
    }
  }, [token]);

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
        <StateView state="error" message="Le chargement des missions a échoué." onRetry={load} />
      </Screen>
    );
  }

  const { pointsTotal, missions } = state.data;

  return (
    <Screen mode="normal" scroll>
      <ChevronStrip />
      <View style={styles.pointsBlock}>
        <Text style={[typography.small, styles.pointsLabel]}>Points totaux</Text>
        <Text style={[typography.dataLarge, styles.pointsValue]}>{pointsTotal}</Text>
      </View>
      <ChevronStrip style={styles.spaced} />

      {missions.length === 0 ? (
        <StateView
          state="empty"
          title="Aucune mission disponible"
          message="Revenez plus tard pour découvrir de nouvelles missions."
          actionLabel="Retour à l'accueil"
          onAction={() => router.replace('/(tabs)')}
        />
      ) : (
        <View style={styles.list}>
          {missions.map((mission) => {
            const completed = mission.status === 'completed';
            return (
              <Pressable
                key={mission.id}
                onPress={() =>
                  mission.course_id
                    ? router.push({ pathname: '/(tabs)/academy/[courseId]', params: { courseId: mission.course_id } })
                    : router.push({ pathname: '/(tabs)/missions/[missionId]', params: { missionId: mission.id } })
                }>
                <Card minHeight={96} style={[styles.missionCard, completed && styles.missionCardCompleted]}>
                  <View style={styles.missionInfo}>
                    <View style={styles.missionTitleRow}>
                      <Text style={typography.h3}>{mission.title}</Text>
                      {completed ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                    <Text style={[typography.small, styles.muted]} numberOfLines={2}>
                      {mission.description}
                    </Text>
                  </View>
                  <PointsBadge value={mission.points_reward} muted={completed} />
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  spaced: {
    marginBottom: spacing.lg,
  },
  pointsBlock: {
    backgroundColor: colors.darkText,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.screenPadding,
    alignItems: 'center',
  },
  pointsLabel: {
    color: colors.stressSubtext,
    marginBottom: spacing.xs,
  },
  pointsValue: {
    color: colors.white,
  },
  list: {
    gap: spacing.sm,
  },
  missionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  missionCardCompleted: {
    borderLeftWidth: 4,
    borderLeftColor: colors.successGreen,
  },
  missionInfo: {
    flex: 1,
  },
  missionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  checkmark: {
    color: colors.successGreen,
    fontWeight: '700',
  },
  muted: {
    color: colors.mutedText,
    marginTop: spacing.xs,
  },
});
