import type { CourseType } from '@/components/ui/CourseIcon';

import { apiFetch } from './api';

export type PathwayStatus =
  | 'not_started'
  | 'in_progress'
  | 'lessons_completed'
  | 'quiz_passed'
  | 'simulation_passed'
  | 'mission_completed'
  | 'completed';

export type CourseProgress = {
  is_course_completed: boolean;
  quiz_best_score: number;
  completed_lessons: string[];
  last_accessed_at: string | null;
  quiz_passed: boolean;
  simulation_passed: boolean;
  mission_completed: boolean;
  badge_awarded: boolean;
  pathway_status: PathwayStatus;
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
  has_simulation: boolean;
  progress: CourseProgress | null;
};

export type LessonStep = {
  id: string;
  title: string;
  description: string;
  image_key: string;
  image_alt: string;
  warning_text: string | null;
};

export type Lesson = {
  id: string;
  title: string;
  content: string;
  content_type: string;
  youtube_video_id: string | null;
  video_duration_seconds: number | null;
  sort_order: number;
  is_required: boolean;
  completed: boolean;
  steps: LessonStep[];
};

export type CompleteLessonResult = {
  completed_lessons: string[];
  is_course_completed: boolean;
  points_awarded: number;
};

export async function getCourses(token: string) {
  const { courses } = await apiFetch<{ courses: Course[] }>('/courses', { token });
  return courses;
}

export function getCourseDetail(token: string, courseId: string) {
  return apiFetch<Course>(`/courses/${courseId}`, { token });
}

export async function getCourseLessons(token: string, courseId: string) {
  const { lessons } = await apiFetch<{ lessons: Lesson[] }>(`/courses/${courseId}/lessons`, { token });
  return lessons;
}

export function completeLesson(token: string, lessonId: string) {
  return apiFetch<CompleteLessonResult>(`/lessons/${lessonId}/complete`, { method: 'POST', token });
}
