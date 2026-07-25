import { apiFetch } from './api';
import type { CourseType } from '@/components/ui/CourseIcon';

export type SosRole = 'witness' | 'victim' | 'with_relative' | 'trained';
export type SosAnswers = Record<string, string | boolean>;

export type SosInstructions = {
  incidentType: CourseType;
  userRole: string;
  riskLevel: 'medium' | 'high';
  emergencyReminder: string;
  steps: string[];
  doNotDo: string[];
  recommendCourseId: string | null;
};

type GenerateInstructionsResponse = {
  session_id: string;
  source: 'pre_validated' | 'cache' | 'ai_call' | 'quota_fallback';
  instructions: SosInstructions;
};

export function startSosSession(token: string) {
  return apiFetch<{ started_at: string }>('/sos/start', { method: 'POST', token });
}

export function generateSosInstructions(
  token: string,
  role: SosRole,
  incidentType: CourseType,
  answers: SosAnswers,
) {
  return apiFetch<GenerateInstructionsResponse>('/sos/generate-instructions', {
    method: 'POST',
    token,
    body: { role, incident_type: incidentType, answers },
  });
}
