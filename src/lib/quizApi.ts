import { apiFetch } from './api';

export type QuizOption = {
  id: string;
  label: string;
  is_correct: boolean;
  sort_order: number;
};

export type QuizQuestion = {
  id: string;
  question: string;
  explanation: string;
  sort_order: number;
  options: QuizOption[];
};

export type Certificate = {
  id: string;
  user_id: string;
  course_id: string;
  course_title: string;
  score: number;
  certificate_number: string;
  is_official: boolean;
  issued_at: string;
};

export type QuizSubmitResult = {
  score_percent: number;
  passed: boolean;
  quiz_best_score: number;
  certificate: Certificate | null;
};

export async function getQuiz(token: string, courseId: string) {
  const { quiz } = await apiFetch<{ quiz: QuizQuestion[] }>(`/courses/${courseId}/quiz`, { token });
  return quiz;
}

export function submitQuiz(
  token: string,
  courseId: string,
  answers: { quiz_id: string; option_id: string }[],
) {
  return apiFetch<QuizSubmitResult>(`/courses/${courseId}/quiz/submit`, {
    method: 'POST',
    token,
    body: { answers },
  });
}
