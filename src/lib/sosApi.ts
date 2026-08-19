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
  // v1.1 : uniquement vrai pour le parcours Malaise cardiaque, quand
  // les 4 conditions de l'exception aspirine sont réunies.
  aspirinOffered: boolean;
};

type GenerateInstructionsResponse = {
  session_id: string;
  source: 'pre_validated' | 'cache' | 'ai_call' | 'quota_fallback';
  instructions: SosInstructions;
};

export type SosQuota = { used: number; limit: number; remaining: number; resets_at: string };

export type SosStart = { started_at: string; prolonged_wait_threshold_minutes: number };

export function startSosSession(token: string) {
  return apiFetch<SosStart>('/sos/start', { method: 'POST', token });
}

export function getSosQuota(token: string) {
  return apiFetch<SosQuota>('/sos/quota', { token });
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

// v1.1, protocole transversal d'attente prolongée (section 3bis).
// Toujours statique côté serveur — jamais de cache/IA/quota.
export type ProlongedWaitAnswers = {
  session_id?: string;
  incident_type: CourseType;
  help_still_coming: string | boolean;
  transport_available: string | boolean;
  no_breathing: string | boolean;
  uncontrolled_bleeding: string | boolean;
  suspected_spine_injury: string | boolean;
};

export type ProlongedWaitOutcome = {
  transportAdvised: boolean;
  steps: string[];
  doNotDo: string[];
};

export function checkProlongedWait(token: string, input: ProlongedWaitAnswers) {
  return apiFetch<{ outcome: ProlongedWaitOutcome }>('/sos/prolonged-wait-check', {
    method: 'POST',
    token,
    body: input,
  });
}
