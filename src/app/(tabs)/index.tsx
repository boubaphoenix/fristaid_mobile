import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  ChevronStrip,
  PointsBadge,
  ProgressSegments,
  Screen,
  StateView,
} from '@/components/ui';
import { colors, radius, sizes, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { type Course, getCourses } from '@/lib/coursesApi';
import { type Kit, getKits } from '@/lib/kitsApi';
import { type Mission, getMissions } from '@/lib/missionsApi';
import { type AuthUser } from '@/lib/authApi';
import { getProfile } from '@/lib/profileApi';

const RESUME_MESSAGE =
  'Encore quelques minutes pour terminer votre cours. Chaque geste appris peut compter en situation d’urgence.';

type HomeData = {
  profile: AuthUser;
  courses: Course[];
  missions: Mission[];
  kits: Kit[];
};

export default function HomeScreen() {
  const { token } = useAuth();
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error'; message: string } | { status: 'success'; data: HomeData }
  >({ status: 'loading' });

  const load = useCallback(async () => {
    if (!token) return;
    setState({ status: 'loading' });
    try {
      const [profile, courses, missions, kits] = await Promise.all([
        getProfile(token),
        getCourses(token),
        getMissions(token),
        getKits(),
      ]);
      setState({ status: 'success', data: { profile, courses, missions, kits } });
    } catch {
      setState({
        status: 'error',
        message: "Le chargement de l'accueil a échoué. Vérifiez votre connexion et réessayez.",
      });
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      <Screen mode="normal" scroll>
        <StateView state="loading" skeletonCount={3} />
      </Screen>
    );
  }

  if (state.status === 'error') {
    return (
      <Screen mode="normal" scroll>
        <StateView state="error" message={state.message} onRetry={load} />
      </Screen>
    );
  }

  const { profile, courses, missions, kits } = state.data;
  const completedCount = courses.filter((c) => c.progress?.is_course_completed).length;
  const courseInProgress = courses.find((c) => c.progress && !c.progress.is_course_completed) ?? null;
  const recommendedMission = missions.find((m) => m.status !== 'completed') ?? null;
  const recommendedKit =
    kits.find((k) => k.id === courseInProgress?.recommended_kit_id) ?? kits[0] ?? null;

  return (
    <Screen mode="normal" scroll>
      <View style={styles.header}>
        <Text style={typography.h2}>
          Bonjour{profile.profile.full_name ? `, ${profile.profile.full_name}` : ''}
        </Text>
        <PointsBadge value={profile.profile.points_total} />
      </View>

      <ChevronStrip style={styles.spaced} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Démarrer le guidage SOS"
        onPress={() => router.push('/(sos)/role')}
        style={styles.sosButton}>
        <Text style={[typography.h1, styles.sosLabel]}>SOS</Text>
      </Pressable>
      <ChevronStrip style={styles.spaced} />

      <View style={styles.spaced}>
        <Text style={[typography.bodyBold, styles.sectionTitle]}>Progression globale</Text>
        <ProgressSegments count={completedCount} total={courses.length || 1} />
      </View>

      <View style={styles.spaced}>
        <Text style={[typography.bodyBold, styles.sectionTitle]}>Reprendre un cours</Text>
        {courseInProgress ? (
          <Pressable onPress={() => router.push('/(tabs)/academy')}>
            <Card>
              <Text style={typography.h3}>{courseInProgress.title}</Text>
              <Text style={[typography.body, styles.muted]}>{RESUME_MESSAGE}</Text>
            </Card>
          </Pressable>
        ) : (
          <StateView
            state="empty"
            title="Aucun cours en cours"
            message="Découvrez l'Académie pour apprendre les premiers gestes essentiels."
            actionLabel="Découvrir l'Académie"
            onAction={() => router.push('/(tabs)/academy')}
          />
        )}
      </View>

      {recommendedMission ? (
        <View style={styles.spaced}>
          <Text style={[typography.bodyBold, styles.sectionTitle]}>Mission recommandée</Text>
          <Pressable onPress={() => router.push('/(tabs)/missions')}>
            <Card>
              <Text style={typography.h3}>{recommendedMission.title}</Text>
              <Text style={[typography.body, styles.muted]}>{recommendedMission.description}</Text>
              <PointsBadge value={recommendedMission.points_reward} />
            </Card>
          </Pressable>
        </View>
      ) : null}

      {recommendedKit ? (
        <View style={styles.spaced}>
          <Text style={[typography.bodyBold, styles.sectionTitle]}>Kit recommandé</Text>
          <Card>
            <Text style={typography.h3}>{recommendedKit.name}</Text>
            <Text style={[typography.data, styles.muted]}>{recommendedKit.price_xof} FCFA</Text>
          </Card>
        </View>
      ) : null}

      {/* Écran Passeport livré en Vague 7 — accès inerte pour l'instant. */}
      <Pressable style={[styles.spaced, styles.passportRow]} accessibilityRole="button" disabled>
        <Text style={typography.bodyBold}>Mon Passeport</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  spaced: {
    marginTop: spacing.lg,
  },
  sosButton: {
    alignSelf: 'center',
    width: sizes.sosButtonHeight,
    height: sizes.sosButtonHeight,
    borderRadius: radius.card,
    backgroundColor: colors.emergencyRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosLabel: {
    color: colors.white,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  muted: {
    color: colors.mutedText,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  passportRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: 'center',
  },
});
