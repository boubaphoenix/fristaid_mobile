import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  ChevronStrip,
  GestureCard,
  OutlineButton,
  PointsBadge,
  ProgressSegments,
  Screen,
  StateView,
} from '@/components/ui';
import { HOME_IMAGES } from '@/constants/homeAssets';
import { colors, radius, sizes, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { type Course, getCourses } from '@/lib/coursesApi';
import { type AuthUser } from '@/lib/authApi';
import { initials } from '@/lib/initials';
import { confirmAlert } from '@/lib/confirmAlert';
import { buildEmergencyMessage, LOCATION_SHARE_COPY, requestAndGetCurrentPosition } from '@/lib/location';
import { shareMessage } from '@/lib/share';
import { getProfile } from '@/lib/profileApi';
import { type LeaderboardResponse, getWeeklyLeaderboard } from '@/lib/leaderboardApi';

const RESUME_MESSAGE =
  'Encore quelques minutes pour terminer votre cours. Chaque geste appris peut compter en situation d’urgence.';

type HomeData = {
  profile: AuthUser;
  courses: Course[];
  leaderboard: LeaderboardResponse | null;
};

export default function HomeScreen() {
  const { token } = useAuth();
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error'; message: string } | { status: 'success'; data: HomeData }
  >({ status: 'loading' });
  const [sosHovered, setSosHovered] = useState(false);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setState({ status: 'loading' });
    try {
      const [profile, courses, leaderboard] = await Promise.all([
        getProfile(token),
        getCourses(token),
        getWeeklyLeaderboard(token).catch(() => null),
      ]);
      setState({ status: 'success', data: { profile, courses, leaderboard } });
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

  // Confirmation obligatoire avant tout partage — même pattern que
  // (sos)/guidance.tsx, mais déclaré localement ici : aucun état ni
  // logique partagée avec l'écran de guidage SOS.
  function handleShareLocationFromHome() {
    setShareFeedback(null);
    confirmAlert(LOCATION_SHARE_COPY.confirmTitle, LOCATION_SHARE_COPY.confirmMessage, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Continuer', onPress: shareLocationFromHomeNow },
    ]);
  }

  async function shareLocationFromHomeNow() {
    setIsSharingLocation(true);
    try {
      const result = await requestAndGetCurrentPosition();
      if (result.status === 'denied') {
        confirmAlert(LOCATION_SHARE_COPY.permissionDeniedTitle, LOCATION_SHARE_COPY.permissionDenied);
        return;
      }
      if (result.status === 'unavailable') {
        confirmAlert(LOCATION_SHARE_COPY.positionUnavailableTitle, LOCATION_SHARE_COPY.positionUnavailable);
        return;
      }
      const message = buildEmergencyMessage(result.latitude, result.longitude, 'long');
      const outcome = await shareMessage(message);
      if (outcome === 'cancelled') {
        setShareFeedback(LOCATION_SHARE_COPY.shareCancelled);
      }
    } finally {
      setIsSharingLocation(false);
    }
  }

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

  const { profile, courses, leaderboard } = state.data;
  const completedCount = courses.filter((c) => c.progress?.is_course_completed).length;
  const courseInProgress = courses.find((c) => c.progress && !c.progress.is_course_completed) ?? null;

  const plsCourse = courses.find((c) => c.category === 'recovery_position') ?? null;
  const reanimationCourse = courses.find((c) => c.category === 'cardiac_arrest') ?? null;
  const hemorragieCourse = courses.find((c) => c.category === 'bleeding') ?? null;
  const etouffementCourse = courses.find((c) => c.category === 'choking') ?? null;

  function goToGesture(course: Course | null) {
    if (course) {
      router.push({ pathname: '/(tabs)/academy/[courseId]', params: { courseId: course.id } });
    } else {
      router.push('/(auth)/emergency-guide');
    }
  }

  return (
    <Screen mode="normal" scroll>
      <View style={styles.header}>
        <View style={styles.greetingRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voir mon profil"
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.avatar}>
            {profile.profile.avatar_url ? (
              <Image source={{ uri: profile.profile.avatar_url }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <Text style={[typography.bodyBold, styles.avatarLabel]}>
                {initials(profile.profile.full_name, profile.email)}
              </Text>
            )}
          </Pressable>
          <Text style={typography.h2}>
            Bonjour{profile.profile.full_name ? `, ${profile.profile.full_name}` : ''}
          </Text>
        </View>
        <PointsBadge value={profile.profile.points_total} />
      </View>

      <View style={[styles.heroContainer, styles.spaced]}>
        <Image
          source={HOME_IMAGES.hero}
          style={styles.hero}
          contentFit="cover"
          contentPosition="center"
        />
        <Text style={[typography.bodyBold, styles.heroCaption]}>
          Apprends les bons gestes avant que l’urgence arrive.
        </Text>
      </View>

      <ChevronStrip style={styles.spaced} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Démarrer le guidage SOS"
        onPress={() => router.push('/(sos)/role')}
        onHoverIn={() => setSosHovered(true)}
        onHoverOut={() => setSosHovered(false)}
        style={[styles.sosButton, sosHovered && styles.sosButtonHovered]}>
        <Text style={[typography.h1, styles.sosLabel]}>SOS</Text>
      </Pressable>
      <ChevronStrip style={styles.spaced} />

      <OutlineButton
        label="Partager ma position"
        onPress={handleShareLocationFromHome}
        variant="brand"
        disabled={isSharingLocation}
        style={styles.spaced}
      />
      {shareFeedback ? <Text style={[typography.small, styles.muted, styles.spaced]}>{shareFeedback}</Text> : null}

      <View style={styles.spaced}>
        <Text style={[typography.bodyBold, styles.sectionTitle]}>Progression globale</Text>
        <ProgressSegments count={completedCount} total={courses.length || 1} />
      </View>

      <View style={styles.spaced}>
        <Text style={[typography.bodyBold, styles.sectionTitle]}>Reprendre un cours</Text>
        {courseInProgress ? (
          <Pressable onPress={() => router.push('/(tabs)/academy')}>
            <Card>
              <Text style={typography.h3} numberOfLines={1}>{courseInProgress.title}</Text>
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

      <View style={styles.spaced}>
        <Text style={[typography.bodyBold, styles.sectionTitle]}>Gestes essentiels</Text>
        <View style={styles.gestureGrid}>
          <GestureCard
            title="PLS"
            imageSource={HOME_IMAGES.pls}
            onPress={() => goToGesture(plsCourse)}
            style={styles.gestureCard}
          />
          <GestureCard
            title="Réanimation"
            imageSource={HOME_IMAGES.reanimation}
            onPress={() => goToGesture(reanimationCourse)}
            style={styles.gestureCard}
          />
          <GestureCard
            title="Hémorragie"
            imageSource={HOME_IMAGES.hemorragie}
            onPress={() => goToGesture(hemorragieCourse)}
            style={styles.gestureCard}
          />
          <GestureCard
            title="Étouffement"
            imageSource={HOME_IMAGES.etouffement}
            onPress={() => goToGesture(etouffementCourse)}
            style={styles.gestureCard}
          />
        </View>
      </View>

      <Pressable style={[styles.spaced, styles.linkRow]} onPress={() => router.push('/weekly-challenge')}>
        <Text style={typography.bodyBold}>Défis de la semaine</Text>
        <Text style={[typography.small, styles.muted]}>Un nouveau défi chaque semaine, gagne des points.</Text>
      </Pressable>

      {leaderboard ? (
        <Pressable style={[styles.spaced, styles.linkRow]} onPress={() => router.push('/leaderboard')}>
          <Text style={typography.bodyBold}>Palmarès des Sauveteurs</Text>
          <Text style={[typography.small, styles.muted]}>
            Rang {leaderboard.me.rank} · {leaderboard.me.points} pts
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        style={[styles.spaced, styles.linkRow]}
        accessibilityRole="button"
        onPress={() => router.push('/passport')}>
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
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.trustBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarLabel: {
    color: colors.white,
  },
  spaced: {
    marginTop: spacing.lg,
  },
  heroContainer: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: 260,
  },
  heroCaption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    color: colors.darkText,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  sosButton: {
    alignSelf: 'center',
    width: sizes.sosButtonHeight,
    height: sizes.sosButtonHeight,
    borderRadius: sizes.sosButtonHeight / 2,
    backgroundColor: colors.emergencyRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Web only (onHoverIn/onHoverOut never fire on touch) : léger
  // agrandissement + halo rouge pour donner un retour visuel au survol.
  sosButtonHovered: {
    transform: [{ scale: 1.06 }],
    shadowColor: colors.emergencyRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 8,
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
  gestureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gestureCard: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  linkRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: 'center',
  },
});
