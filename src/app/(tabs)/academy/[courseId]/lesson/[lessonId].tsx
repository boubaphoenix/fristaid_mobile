import { router, useLocalSearchParams } from 'expo-router';
import { Component, lazy, Suspense, type ReactNode, useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ChevronStrip, PointsBadge, PrimaryButton, ProgressSegments, Screen, StateView } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { completeLesson, getCourseLessons, type Lesson } from '@/lib/coursesApi';

// Chargé à la demande : react-native-youtube-iframe (WebView) ne doit être
// requis que quand une leçon avec vidéo est réellement ouverte, pas au
// démarrage de l'app pour tout le monde.
const VideoCapsule = lazy(() =>
  import('@/components/ui/VideoCapsule').then((m) => ({ default: m.VideoCapsule })),
);

// Filet de sécurité pour les échecs *synchrones* de VideoCapsule (ex. module
// natif WebView manquant sur un build non regénéré) — le timeout interne de
// VideoCapsule ne couvre que les échecs asynchrones (pas de onReady/onError).
// Une leçon de premiers secours ne doit jamais devenir illisible à cause
// d'une vidéo cassée : ce garde-fou isole l'échec au bloc vidéo seul.
class VideoCapsuleBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.videoErrorBlock}>
          <Text style={[typography.body, styles.videoErrorText]}>
            Vidéo indisponible hors-ligne — lisez le cours ci-dessous
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Écran 07 — lecture d'une leçon.
export default function LessonScreen() {
  const { token } = useAuth();
  const { courseId, lessonId } = useLocalSearchParams<{ courseId: string; lessonId: string }>();
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error' } | { status: 'success'; lessons: Lesson[] }
  >({ status: 'loading' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token || !courseId) return;
    setState({ status: 'loading' });
    try {
      const lessons = await getCourseLessons(token, courseId);
      setState({ status: 'success', lessons });
    } catch {
      setState({ status: 'error' });
    }
  }, [token, courseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUnderstood() {
    if (!token || !lessonId || !courseId) return;
    setIsSubmitting(true);
    try {
      const result = await completeLesson(token, lessonId);
      setPointsAwarded(result.points_awarded);
      router.replace({ pathname: '/(tabs)/academy/[courseId]', params: { courseId } });
    } catch {
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
        <StateView state="error" message="Le chargement de la leçon a échoué." onRetry={load} />
      </Screen>
    );
  }

  const { lessons } = state;
  const index = lessons.findIndex((l) => l.id === lessonId);
  const lesson = lessons[index];
  if (!lesson) {
    return (
      <Screen mode="normal" scroll>
        <StateView state="error" message="Leçon introuvable." onRetry={load} />
      </Screen>
    );
  }

  return (
    <Screen mode="normal" scroll>
      <View style={styles.progress}>
        <Text style={[typography.data, styles.muted]}>
          Leçon {index + 1}/{lessons.length}
        </Text>
        <ProgressSegments count={index + 1} total={lessons.length} />
      </View>

      <Text style={[typography.h2, styles.spaced]}>{lesson.title}</Text>

      {lesson.youtube_video_id ? (
        <View style={styles.spaced}>
          <VideoCapsuleBoundary>
            <Suspense fallback={<View style={styles.videoLoadingBlock} />}>
              <VideoCapsule videoId={lesson.youtube_video_id} durationSeconds={lesson.video_duration_seconds} />
            </Suspense>
          </VideoCapsuleBoundary>
        </View>
      ) : null}

      <View style={styles.spaced}>
        <ChevronStrip />
        <View style={styles.retainBlock}>
          <Text style={[typography.body, styles.retainText]}>{lesson.content}</Text>
        </View>
        <ChevronStrip />
      </View>

      {pointsAwarded !== null && pointsAwarded > 0 ? (
        <View style={styles.spaced}>
          <PointsBadge value={pointsAwarded} />
        </View>
      ) : null}

      <PrimaryButton
        label={lesson.completed ? 'Leçon déjà terminée' : "J'ai compris"}
        onPress={handleUnderstood}
        loading={isSubmitting}
        disabled={lesson.completed || isSubmitting}
        variant="success"
        style={styles.spaced}
      />
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
  retainBlock: {
    backgroundColor: colors.darkText,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  retainText: {
    color: colors.white,
  },
  videoErrorBlock: {
    backgroundColor: colors.warningBg,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  videoLoadingBlock: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.border,
    borderRadius: radius.card,
  },
  videoErrorText: {
    color: colors.darkText,
  },
});
