import type { CourseType } from '@/components/ui/CourseIcon';
import type { SosRole } from '@/lib/sosApi';

// Contenu statique du parcours SOS (écrans 11-13) — PRD §11.9 (rôles),
// §11.10 (identifiants techniques des incidents) et §11.11 (questions
// qui alimentent les règles médicales spécifiques, ex. malaise).
//
// v1.1 : AVC comme 9ᵉ incident, sous-triage Malaise à 4 parcours
// (voir getNextMalaiseQuestion plus bas — le seul incident dont les
// questions dépendent dynamiquement des réponses précédentes ; tous
// les autres restent une liste fixe posée dans l'ordre).
//
// IncidentType exclut les catégories de cours qui ne sont pas des incidents
// sélectionnables dans le parcours SOS : recovery_position (une technique
// référencée depuis malaise/drowning), general_principles (le cours
// d'ouverture de l'Académie) et vital_sequence (la séquence DR ABCDE,
// une méthodologie transverse) ne sont jamais un "que se passe-t-il ?".
export type IncidentType = Exclude<CourseType, 'recovery_position' | 'general_principles' | 'vital_sequence'>;

export const ROLES: { value: SosRole; label: string }[] = [
  { value: 'witness', label: 'Je suis témoin' },
  { value: 'victim', label: 'Je suis la victime' },
  { value: 'with_relative', label: 'Je suis avec un proche' },
  { value: 'trained', label: 'Je suis secouriste / personnel formé' },
];

// Type CourseType (pas IncidentType) : utilisé aussi côté Académie
// ([courseId]/index.tsx) pour colorer l'en-tête de n'importe quel cours,
// pas seulement les 9 incidents sélectionnables dans le parcours SOS.
export const VITAL_INCIDENTS: ReadonlySet<CourseType> = new Set(['bleeding', 'cardiac_arrest', 'drowning', 'avc']);

export const INCIDENTS: { value: IncidentType; label: string }[] = [
  { value: 'road_accident', label: 'Accident de circulation' },
  { value: 'bleeding', label: 'Hémorragie' },
  { value: 'choking', label: 'Étouffement' },
  { value: 'burn', label: 'Brûlure' },
  { value: 'malaise', label: 'Malaise' },
  { value: 'fall', label: 'Chute' },
  { value: 'cardiac_arrest', label: 'Arrêt cardiaque' },
  { value: 'drowning', label: 'Noyade' },
  { value: 'avc', label: 'AVC' },
];

export type SosQuestion = { key: string; question: string };

// Questions du test FAST — partagées à l'identique entre le sous-triage
// Malaise (question de bascule) et l'incident AVC (mêmes clés), pour
// qu'une bascule mid-flow ne repose jamais une question déjà répondue.
export const FAST_FACE: SosQuestion = { key: 'fast_face', question: 'Un côté du visage est-il affaissé ?' };
export const FAST_ARM: SosQuestion = { key: 'fast_arm', question: 'Un bras retombe-t-il ou reste-t-il faible ?' };
export const FAST_SPEECH: SosQuestion = { key: 'fast_speech', question: 'La parole est-elle confuse ou pâteuse ?' };
export const FAST_ONSET_TIME: SosQuestion = {
  key: 'fast_onset_time',
  question: 'Les signes sont-ils apparus il y a moins d’une heure ?',
};

// Les clés des incidents existants (conscious, breathing_difficulty,
// abnormal_breathing, dangerous_environment côté malaise, etc.)
// doivent rester identiques au backend (src/ai/scenarios.ts côté API)
// : elles pilotent les règles médicales spécifiques. `malaise` n'a
// volontairement plus d'entrée ici (sous-triage dynamique, voir
// getNextMalaiseQuestion) — questions.tsx doit utiliser ce résolveur
// pour cet incident plutôt que ce tableau fixe.
export const QUESTIONS_BY_INCIDENT: Record<Exclude<IncidentType, 'malaise'>, SosQuestion[]> = {
  road_accident: [{ key: 'scene_secured', question: 'La zone est-elle sécurisée (circulation, danger) ?' }],
  bleeding: [{ key: 'heavy_bleeding', question: 'Le saignement est-il abondant ou ne s’arrête pas ?' }],
  choking: [{ key: 'can_cough', question: 'La personne peut-elle encore tousser ou parler ?' }],
  burn: [{ key: 'extensive_burn', question: 'La brûlure semble-t-elle étendue ou profonde ?' }],
  fall: [{ key: 'can_move', question: 'La personne peut-elle bouger sans douleur intense ?' }],
  cardiac_arrest: [{ key: 'reacts', question: 'La personne réagit-elle si vous lui parlez ?' }],
  drowning: [{ key: 'safe_to_reach', question: 'La victime est-elle accessible sans danger pour vous ?' }],
  avc: [FAST_FACE, FAST_ARM, FAST_SPEECH, FAST_ONSET_TIME],
};

// v1.1, sous-triage Malaise à 4 parcours. Ordre impératif du document :
// 1) tronc commun sécurité/conscience/respiration, 2) test FAST — un
// signe positif bascule immédiatement vers l'incident AVC (voir
// questions.tsx, ne pas continuer le sous-triage), 3) cause (cardiaque
// → questions aspirine si douleur positive → hypoglycémie → coup de
// chaleur → vagal par défaut), en s'arrêtant à la première réponse
// positive. Retourne la prochaine question à poser, ou `null` quand le
// sous-triage est terminé (le dernier appel a fourni la réponse
// finale) — jamais de retour à une question déjà répondue.
export function getNextMalaiseQuestion(answers: Record<string, string>): SosQuestion | null {
  if (!('conscious' in answers)) return { key: 'conscious', question: 'La personne est-elle consciente ?' };
  if (!('abnormal_breathing' in answers)) return { key: 'abnormal_breathing', question: 'Sa respiration semble-t-elle anormale ?' };
  if (!('dangerous_environment' in answers)) {
    return { key: 'dangerous_environment', question: "L'environnement autour d'elle est-il dangereux ?" };
  }

  // Signe grave au tronc commun : le sous-triage cause n'a plus de
  // sens (voir resolveMalaiseSubTriage côté backend, même règle).
  const conscious = answers.conscious !== 'false';
  const abnormalBreathing = answers.abnormal_breathing === 'true';
  if (!conscious || abnormalBreathing) return null;

  if (!('fast_face' in answers)) return FAST_FACE;
  if (!('fast_arm' in answers)) return FAST_ARM;
  if (!('fast_speech' in answers)) return FAST_SPEECH;

  // Un signe FAST positif : questions.tsx bascule vers l'incident AVC
  // et n'appelle plus ce résolveur — ce cas ne devrait normalement pas
  // redemander de question ici, mais on s'arrête proprement par
  // sécurité si jamais il est atteint quand même.
  const fastPositive = answers.fast_face === 'true' || answers.fast_arm === 'true' || answers.fast_speech === 'true';
  if (fastPositive) return null;

  if (!('cardiac_pain' in answers)) {
    return {
      key: 'cardiac_pain',
      question: 'Douleur ou pression dans la poitrine, essoufflement, ou nausées/mâchoire sans douleur thoracique ?',
    };
  }
  if (answers.cardiac_pain === 'true') {
    if (!('swallow_normally' in answers)) return { key: 'swallow_normally', question: 'Est-elle capable d’avaler normalement ?' };
    if (!('known_aspirin_allergy' in answers)) return { key: 'known_aspirin_allergy', question: 'A-t-elle une allergie connue à l’aspirine ?' };
    return null;
  }

  if (!('diabetic_hypo_signs' in answers)) {
    return {
      key: 'diabetic_hypo_signs',
      question: 'Diabétique connue avec tremblements/sueurs, ou enfant fiévreux/gravement malade et somnolent ?',
    };
  }
  if (answers.diabetic_hypo_signs === 'true') return null;

  if (!('heat_exposure_signs' in answers)) {
    return {
      key: 'heat_exposure_signs',
      question: 'Exposition prolongée à la chaleur, transpiration abondante puis peau sèche et chaude, ou confusion ?',
    };
  }
  if (answers.heat_exposure_signs === 'true') return null;

  if (!('rapid_recovery_lying' in answers)) {
    return { key: 'rapid_recovery_lying', question: 'Récupère-t-elle rapidement en position allongée ?' };
  }
  return null;
}
