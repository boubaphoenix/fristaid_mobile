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
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kits de secours"
          onPress={() => router.push('/kits')}
          style={styles.kitButton}>
          <View style={styles.kitBadge}>
            <View style={styles.bagHandle} />
            <View style={styles.bagBody}>
              <View style={styles.bagCrossV} />
              <View style={styles.bagCrossH} />
            </View>
          </View>
        </Pressable>
      </View>

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
          <Pressable
            onPress={() => router.push({ pathname: '/kits/[kitId]', params: { kitId: recommendedKit.id } })}>
            <Card>
              <Text style={typography.h3}>{recommendedKit.name}</Text>
              <Text style={[typography.data, styles.muted]}>{recommendedKit.price_xof} FCFA</Text>
            </Card>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        style={[styles.spaced, styles.passportRow]}
        accessibilityRole="button"
        onPress={() => router.push('/passport')}>
        <Text style={typography.bodyBold}>Mon Passeport</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: spacing.sm,
  },
  // Exception documentée à la règle "emergencyRed réservé aux urgences
  // réelles" : demande explicite de l'utilisateur (2026-07-27) pour ce
  // bouton précis. Pictogramme en formes géométriques (pas d'image
  // importée) pour rester cohérent avec CourseIcon/ChevronStrip.
  kitButton: {
    width: 44,
    height: 44,
    borderRadius: radius.card,
    backgroundColor: colors.emergencyRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kitBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bagHandle: {
    position: 'absolute',
    top: 5,
    width: 10,
    height: 5,
    borderWidth: 2,
    borderColor: colors.emergencyRed,
    borderBottomWidth: 0,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  bagBody: {
    width: 18,
    height: 13,
    marginTop: 6,
    borderRadius: 3,
    backgroundColor: colors.emergencyRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bagCrossV: {
    position: 'absolute',
    width: 2,
    height: 8,
    backgroundColor: colors.white,
    borderRadius: 1,
  },
  bagCrossH: {
    position: 'absolute',
    width: 8,
    height: 2,
    backgroundColor: colors.white,
    borderRadius: 1,
  },
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
