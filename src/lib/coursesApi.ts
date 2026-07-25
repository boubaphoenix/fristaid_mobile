import type { CourseType } from '@/components/ui/CourseIcon';

import { apiFetch } from './api';

export type CourseProgress = {
  is_course_completed: boolean;
  quiz_best_score: number;
  completed_lessons: unknown;
  last_accessed_at: string | null;
};

export type Course = {
  id: string;
  title: string;
  description: string;
  category: CourseType;
  duration_minutes: number;
  level: string;
  image_url: string | null;
  recommended_kit_id: string | null;
  sort_order: number;
  lessons_count: number;
  progress: CourseProgress | null;
};

export async function getCourses(token: string) {
  const { courses } = await apiFetch<{ courses: Course[] }>('/courses', { token });
  return courses;
}
