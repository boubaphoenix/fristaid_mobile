import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, ChevronStrip, Screen, StateView, TitleProgressCard } from '@/components/ui';
import { colors, radius, sizes, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  type LeaderboardResponse,
  type PeriodType,
  getMonthlyLeaderboard,
  getWeeklyLeaderboard,
} from '@/lib/leaderboardApi';

// Écran classement — atteint depuis l'accueil et le profil, pas un
// onglet (même pattern que passport.tsx : router.back() suffit, pas
// besoin d'un Stack dédié pour un simple bouton retour).
export default function LeaderboardScreen() {
  const { token } = useAuth();
  const [period, setPeriod] = useState<PeriodType>('week');
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error' } | { status: 'success'; data: LeaderboardResponse }
  >({ status: 'loading' });

  const load = useCallback(async () => {
    if (!token) return;
    setState({ status: 'loading' });
    try {
      const data = period === 'week' ? await getWeeklyLeaderboard(token) : await getMonthlyLeaderboard(token);
      setState({ status: 'success', data });
    } catch {
      setState({ status: 'error' });
    }
  }, [token, period]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen mode="normal" scroll>
      <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8} style={styles.backLink}>
        <Text style={[typography.bodyBold, styles.backLabel]}>← Retour</Text>
      </Pressable>

      <ChevronStrip />
      <Text style={[typography.h2, styles.spaced]}>Classement AFRICASECOUR</Text>

      <View style={[styles.toggleRow, styles.spaced]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: period === 'week' }}
          onPress={() => setPeriod('week')}
          style={[styles.toggleButton, period === 'week' && styles.toggleButtonActive]}>
          <Text style={[typography.bodyBold, period === 'week' ? styles.toggleTextActive : styles.toggleText]}>
            Cette semaine
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: period === 'month' }}
          onPress={() => setPeriod('month')}
          style={[styles.toggleButton, period === 'month' && styles.toggleButtonActive]}>
          <Text style={[typography.bodyBold, period === 'month' ? styles.toggleTextActive : styles.toggleText]}>
            Ce mois
          </Text>
        </Pressable>
      </View>

      {state.status === 'loading' ? <StateView state="loading" /> : null}
      {state.status === 'error' ? (
        <StateView state="error" message="Le chargement du classement a échoué." onRetry={load} />
      ) : null}

      {state.status === 'success' ? (
        <>
          <View style={styles.spaced}>
            <Card>
              <Text style={typography.bodyBold}>{state.data.me.message}</Text>
              <Text style={[typography.data, styles.muted]}>
                Rang {state.data.me.rank} · {state.data.me.points} points
              </Text>
              {state.data.me.rank_title ? (
                <Text style={[typography.small, styles.rankTitle]}>{state.data.me.rank_title}</Text>
              ) : null}
            </Card>
          </View>

          <View style={styles.spaced}>
            <TitleProgressCard
              title={state.data.me.title}
              nextTitle={state.data.me.next_title}
              pointsToNext={state.data.me.points_to_next_title}
            />
          </View>

          <View style={styles.spaced}>
            <Text style={[typography.bodyBold, styles.sectionTitle]}>Top 100</Text>
            {state.data.entries.length === 0 ? (
              <Text style={[typography.body, styles.muted]}>
                Personne n'a encore gagné de points {period === 'week' ? 'cette semaine' : 'ce mois-ci'}.
              </Text>
            ) : (
              state.data.entries.map((entry) => (
                <Card key={entry.user_id} style={styles.entryCard}>
                  <Text style={[typography.data, styles.entryRank]}>{entry.rank}</Text>
                  <View style={styles.entryInfo}>
                    <Text style={typography.body}>{entry.display_name}</Text>
                    <Text style={[typography.small, styles.muted]}>{entry.title}</Text>
                  </View>
                  <Text style={[typography.data, styles.entryPoints]}>{entry.points}</Text>
                </Card>
              ))
            )}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backLink: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  backLabel: {
    color: colors.trustBlue,
  },
  spaced: {
    marginTop: spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    minHeight: sizes.touchMin,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.trustBlue,
    borderColor: colors.trustBlue,
  },
  toggleText: {
    color: colors.darkText,
  },
  toggleTextActive: {
    color: colors.white,
  },
  muted: {
    color: colors.mutedText,
    marginTop: spacing.xs,
  },
  rankTitle: {
    color: colors.trustBlue,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  entryRank: {
    color: colors.trustBlue,
    width: 32,
  },
  entryInfo: {
    flex: 1,
  },
  entryPoints: {
    color: colors.trustBlue,
  },
});
