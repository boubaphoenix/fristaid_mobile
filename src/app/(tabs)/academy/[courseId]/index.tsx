import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, PathwayStepper, PrimaryButton, Screen, StateView } from '@/components/ui';
import { VITAL_INCIDENTS } from '@/constants/sosContent';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { type Course, type Lesson, getCourseDetail, getCourseLessons } from '@/lib/coursesApi';
import { type Kit, getKits } from '@/lib/kitsApi';
import { type Mission, getMissions } from '@/lib/missionsApi';

type DetailData = { course: Course; lessons: Lesson[]; mission: Mission | null; kit: Kit | null };

// Écran 06 — détail d'un cours.
export default function CourseDetailScreen() {
  const { token } = useAuth();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error' } | { status: 'success'; data: DetailData }
  >({ status: 'loading' });

  const load = useCallback(async () => {
    if (!token || !courseId) return;
    setState({ status: 'loading' });
    try {
      const [course, lessons, missions, kits] = await Promise.all([
        getCourseDetail(token, courseId),
        getCourseLessons(token, courseId),
        getMissions(token),
        getKits(),
      ]);
      const mission = missions.find((m) => m.course_id === courseId) ?? null;
      const kit = kits.find((k) => k.id === course.recommended_kit_id) ?? null;
      setState({ status: 'success', data: { course, lessons, mission, kit } });
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
        <StateView state="error" message="Le chargement du cours a échoué." onRetry={load} />
      </Screen>
    );
  }

  const { course, lessons, mission, kit } = state.data;
  const isVital = VITAL_INCIDENTS.has(course.category);
  const allLessonsCompleted = lessons.length > 0 && lessons.every((l) => l.completed);
  const nextLesson = lessons.find((l) => !l.completed) ?? lessons[0];
  const progress = course.progress;
  const hasVideo = lessons.some((l) => l.youtube_video_id);
  const quizPassed = progress?.quiz_passed ?? false;
  const simulationPassed = progress?.simulation_passed ?? false;
  const missionCompleted = progress?.mission_completed ?? false;
  const badgeAwarded = progress?.badge_awarded ?? false;

  return (
    <Screen mode="normal" scroll>
      <View style={[styles.header, { backgroundColor: isVital ? colors.emergencyRed : colors.trustBlue }]}>
        <Text style={[typography.h2, styles.headerText]}>{course.title}</Text>
        <Text style={[typography.body, styles.headerText]}>{course.description}</Text>
      </View>

      <View style={styles.spaced}>
        <PathwayStepper
          videoAvailable={hasVideo}
          lessonsCompleted={allLessonsCompleted}
          quizPassed={quizPassed}
          simulationPassed={simulationPassed}
          missionCompleted={missionCompleted}
          badgeAwarded={badgeAwarded}
        />
      </View>

      <View style={styles.spaced}>
        <Text style={[typography.bodyBold, styles.sectionTitle]}>Leçons</Text>
        {lessons.map((lesson, index) => (
          <Pressable
            key={lesson.id}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/academy/[courseId]/lesson/[lessonId]',
                params: { courseId: course.id, lessonId: lesson.id },
              })
            }>
            <Card style={styles.lessonCard}>
              <Text style={[typography.data, styles.lessonNumber]}>{index + 1}</Text>
              <Text style={[typography.body, styles.lessonTitle]}>{lesson.title}</Text>
              {lesson.completed ? <Text style={styles.checkmark}>✓</Text> : null}
            </Card>
          </Pressable>
        ))}
      </View>

      <View style={styles.spaced}>
        <Text style={[typography.bodyBold, styles.sectionTitle]}>Quiz</Text>
        <Pressable
          disabled={!allLessonsCompleted}
          onPress={() => router.push({ pathname: '/(tabs)/academy/[courseId]/quiz', params: { courseId: course.id } })}>
          <Card style={!allLessonsCompleted ? styles.lockedCard : undefined}>
            <Text style={typography.body}>
              {allLessonsCompleted ? 'Faire le quiz' : 'Verrouillé — terminez les leçons pour le débloquer'}
            </Text>
          </Card>
        </Pressable>
      </View>

      <View style={styles.spaced}>
        <Text style={[typography.bodyBold, styles.sectionTitle]}>Simulation</Text>
        <Pressable
          disabled={!quizPassed}
          onPress={() =>
            router.push({ pathname: '/(tabs)/academy/[courseId]/simulation', params: { courseId: course.id } })
          }>
          <Card style={!quizPassed ? styles.lockedCard : undefined}>
            <Text style={typography.body}>
              {quizPassed ? 'Faire la simulation' : 'Verrouillé — réussissez le quiz pour la débloquer'}
            </Text>
          </Card>
        </Pressable>
      </View>

      {mission ? (
        <View style={styles.spaced}>
          <Text style={[typography.bodyBold, styles.sectionTitle]}>Mission</Text>
          <Pressable
            disabled={!simulationPassed}
            onPress={() =>
              router.push({ pathname: '/(tabs)/missions/[missionId]', params: { missionId: mission.id } })
            }>
            <Card style={!simulationPassed ? styles.lockedCard : undefined}>
              <Text style={typography.body}>
                {simulationPassed ? mission.title : 'Verrouillé — réussissez la simulation pour la débloquer'}
              </Text>
            </Card>
          </Pressable>
        </View>
      ) : null}

      {badgeAwarded ? (
        <View style={styles.spaced}>
          <Text style={[typography.bodyBold, styles.sectionTitle]}>Badge</Text>
          <Pressable onPress={() => router.push('/passport')}>
            <Card>
              <Text style={typography.body}>🏅 Badge obtenu — voir le Passeport</Text>
            </Card>
          </Pressable>
        </View>
      ) : null}

      {kit ? (
        <View style={styles.spaced}>
          <Text style={[typography.bodyBold, styles.sectionTitle]}>Kit recommandé</Text>
          <Card>
            <Text style={typography.body}>{kit.name}</Text>
            <Text style={[typography.data, styles.muted]}>{kit.price_xof} FCFA</Text>
          </Card>
        </View>
      ) : null}

      <PrimaryButton
        label={allLessonsCompleted ? 'Revoir une leçon' : 'Continuer le cours'}
        onPress={() =>
          nextLesson &&
          router.push({
            pathname: '/(tabs)/academy/[courseId]/lesson/[lessonId]',
            params: { courseId: course.id, lessonId: nextLesson.id },
          })
        }
        style={styles.spaced}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.md,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  headerText: {
    color: colors.white,
  },
  spaced: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  lessonNumber: {
    color: colors.trustBlue,
  },
  lessonTitle: {
    flex: 1,
  },
  checkmark: {
    color: colors.successGreen,
  },
  lockedCard: {
    opacity: 0.6,
  },
  muted: {
    color: colors.mutedText,
  },
});
