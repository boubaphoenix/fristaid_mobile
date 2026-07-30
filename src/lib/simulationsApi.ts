import { apiFetch } from './api';

export type SimulationStep = {
  id: string;
  question: string;
  options: string[];
  order_index: number;
};

export type Simulation = {
  id: string;
  title: string;
  scenario: string;
  passing_score: number;
};

export type SimulationBadge = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  icon_url: string | null;
};

export type SimulationSubmitResult = {
  score_percent: number;
  passed: boolean;
  passing_score: number;
  points_awarded: number;
  steps: { step_id: string; correct_option: number; explanation: string }[];
  badge: SimulationBadge | null;
};

export function getSimulation(token: string, courseId: string) {
  return apiFetch<{ simulation: Simulation; steps: SimulationStep[] }>(`/courses/${courseId}/simulation`, { token });
}

export function submitSimulation(
  token: string,
  courseId: string,
  answers: { step_id: string; selected_option: number }[],
) {
  return apiFetch<SimulationSubmitResult>(`/courses/${courseId}/simulation/submit`, {
    method: 'POST',
    token,
    body: { answers },
  });
}
