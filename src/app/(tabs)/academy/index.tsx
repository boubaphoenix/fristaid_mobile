import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, CourseIcon, Screen, StateView } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { type Course, getCourses } from '@/lib/coursesApi';

type Filter = 'all' | 'not_started' | 'in_progress' | 'completed';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'not_started', label: 'Non commencés' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminés' },
];

function matchesFilter(course: Course, filter: Filter): boolean {
  switch (filter) {
    case 'not_started':
      return course.progress === null;
    case 'in_progress':
      return course.progress !== null && !course.progress.is_course_completed;
    case 'completed':
      return course.progress !== null && course.progress.is_course_completed;
    default:
      return true;
  }
}

// Écran 05 — liste des cours.
export default function CourseListScreen() {
  const { token } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error' } | { status: 'success'; courses: Course[] }
  >({ status: 'loading' });

  const load = useCallback(async () => {
    if (!token) return;
    setState({ status: 'loading' });
    try {
      const courses = await getCourses(token);
      setState({ status: 'success', courses: courses.sort((a, b) => a.sort_order - b.sort_order) });
    } catch {
      setState({ status: 'error' });
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen mode="normal" scroll>
      <Text style={[typography.h2, styles.title]}>Académie</Text>

      <View style={styles.pillRow}>
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <Pressable
              key={f.value}
              accessibilityRole="button"
              onPress={() => setFilter(f.value)}
              style={[styles.pill, active && styles.pillActive]}>
              <Text style={[typography.small, active ? styles.pillLabelActive : styles.pillLabel]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {state.status === 'loading' ? <StateView state="loading" /> : null}
      {state.status === 'error' ? (
        <StateView state="error" message="Le chargement des cours a échoué." onRetry={load} />
      ) : null}
      {state.status === 'success' ? (
        (() => {
          const filtered = state.courses.filter((c) => matchesFilter(c, filter));
          if (filtered.length === 0) {
            return (
              <StateView
                state="empty"
                title="Aucun cours ici"
                message="Essayez un autre filtre pour voir vos cours."
                actionLabel="Voir tous les cours"
                onAction={() => setFilter('all')}
              />
            );
          }
          return (
            <View style={styles.list}>
              {filtered.map((course) => (
                <Pressable
                  key={course.id}
                  onPress={() => router.push({ pathname: '/(tabs)/academy/[courseId]', params: { courseId: course.id } })}>
                  <Card style={styles.courseCard}>
                    <CourseIcon type={course.category} />
                    <View style={styles.courseInfo}>
                      <Text style={typography.h3}>{course.title}</Text>
                      <Text style={[typography.small, styles.muted]}>
                        {course.lessons_count} leçons · {course.duration_minutes} min
                      </Text>
                    </View>
                    {course.progress?.is_course_completed ? (
                      <Text style={[typography.h3, styles.checkmark]}>✓</Text>
                    ) : null}
                  </Card>
                </Pressable>
              ))}
            </View>
          );
        })()
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.trustBlue,
    borderColor: colors.trustBlue,
  },
  pillLabel: {
    color: colors.darkText,
  },
  pillLabelActive: {
    color: colors.white,
  },
  list: {
    gap: spacing.sm,
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  courseInfo: {
    flex: 1,
  },
  muted: {
    color: colors.mutedText,
  },
  checkmark: {
    color: colors.successGreen,
  },
});
