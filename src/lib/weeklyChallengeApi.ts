import { apiFetch } from './api';

export type ChallengeType =
  | 'true_false'
  | 'simulation'
  | 'reminder'
  | 'seasonal'
  | 'visual_recognition'
  | 'real_action';

export type TrueFalseContent = {
  statement: string;
};

// Le rappel réutilise toujours un vrai/faux existant (même forme de
// contenu), avec une phrase d'intro ajoutée pour le distinguer visuellement.
export type ReminderContent = TrueFalseContent & { intro_phrase: string };

// Le saisonnier réutilise lui aussi un vrai/faux existant, enrichi d'un
// Contexte (pourquoi ce risque augmente) et d'un Fait (complément concret),
// affichés avant la question.
export type SeasonalContent = TrueFalseContent & { context_sentence: string; fact_sentence: string };

export type SimulationStepContent = {
  question: string;
  options: string[];
};

export type SimulationContent = {
  scenario: string;
  success_message: string;
  steps: SimulationStepContent[];
};

export type VisualRecognitionContent = {
  image_key: string;
  question: string;
  mode: 'true_false' | 'single_select';
  options?: string[];
};

export type RealActionContent = {
  instructions: string;
  requires_note: boolean;
};

// `correct_answer`/`correct_option`/`explanation` ne sont volontairement
// jamais renvoyés par le backend avant soumission (même logique que le quiz
// de cours, où `is_correct` n'arrive qu'après réponse) — ils ne sont connus
// qu'après POST /weekly-challenges/:id/attempt.
type WeeklyChallengeCourse = { id: string; title: string } | null;

export type WeeklyChallenge =
  | { id: string; type: 'true_false'; title: string; description: string; points_reward: number; content: TrueFalseContent; course: WeeklyChallengeCourse }
  | { id: string; type: 'simulation'; title: string; description: string; points_reward: number; content: SimulationContent; course: WeeklyChallengeCourse }
  | { id: string; type: 'reminder'; title: string; description: string; points_reward: number; content: ReminderContent; course: WeeklyChallengeCourse }
  | { id: string; type: 'seasonal'; title: string; description: string; points_reward: number; content: SeasonalContent; course: WeeklyChallengeCourse }
  | { id: string; type: 'visual_recognition'; title: string; description: string; points_reward: number; content: VisualRecognitionContent; course: WeeklyChallengeCourse }
  | { id: string; type: 'real_action'; title: string; description: string; points_reward: number; content: RealActionContent; course: WeeklyChallengeCourse };

export type WeeklyChallengeAnswer =
  | { value: boolean }
  | { selected_option: number }
  // 'simulation' a plusieurs steps (content.steps) — une réponse par step,
  // dans l'ordre, soumises ensemble en une seule tentative.
  | { selected_options: number[] }
  | { completed: true; note?: string };

export type WeeklyChallengeAttemptResult = {
  is_correct: boolean | null;
  points_awarded: number;
  explanation: string | null;
};

export async function getCurrentWeeklyChallenge(token: string) {
  const { challenge, already_attempted } = await apiFetch<{
    challenge: WeeklyChallenge | null;
    already_attempted: boolean;
  }>('/weekly-challenges/current', { token });
  return { challenge, alreadyAttempted: already_attempted };
}

export function submitWeeklyChallengeAttempt(token: string, challengeId: string, answer: WeeklyChallengeAnswer) {
  return apiFetch<WeeklyChallengeAttemptResult>(`/weekly-challenges/${challengeId}/attempt`, {
    method: 'POST',
    token,
    body: { answer },
  });
}
