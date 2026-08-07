import type { CourseType } from '@/components/ui/CourseIcon';
import type { SosRole } from '@/lib/sosApi';

// Contenu statique du parcours SOS (écrans 11-13) — PRD §11.9 (rôles),
// §11.10 (identifiants techniques des incidents) et §11.11 (questions
// qui alimentent les règles médicales spécifiques, ex. malaise).
//
// IncidentType exclut les catégories de cours qui ne sont pas des incidents
// sélectionnables dans le parcours SOS : recovery_position (une technique
// référencée depuis malaise/drowning) et general_principles (le cours
// d'ouverture de l'Académie) ne sont jamais un "que se passe-t-il ?".
export type IncidentType = Exclude<CourseType, 'recovery_position' | 'general_principles'>;

export const ROLES: { value: SosRole; label: string }[] = [
  { value: 'witness', label: 'Je suis témoin' },
  { value: 'victim', label: 'Je suis la victime' },
  { value: 'with_relative', label: 'Je suis avec un proche' },
  { value: 'trained', label: 'Je suis secouriste / personnel formé' },
];

// Type CourseType (pas IncidentType) : utilisé aussi côté Académie
// ([courseId]/index.tsx) pour colorer l'en-tête de n'importe quel cours,
// pas seulement les 8 incidents sélectionnables dans le parcours SOS.
export const VITAL_INCIDENTS: ReadonlySet<CourseType> = new Set(['bleeding', 'cardiac_arrest', 'drowning']);

export const INCIDENTS: { value: IncidentType; label: string }[] = [
  { value: 'road_accident', label: 'Accident de circulation' },
  { value: 'bleeding', label: 'Hémorragie' },
  { value: 'choking', label: 'Étouffement' },
  { value: 'burn', label: 'Brûlure' },
  { value: 'malaise', label: 'Malaise' },
  { value: 'fall', label: 'Chute' },
  { value: 'cardiac_arrest', label: 'Arrêt cardiaque' },
  { value: 'drowning', label: 'Noyade' },
];

export type SosQuestion = { key: string; question: string };

// Les clés du malaise (conscious, breathing_difficulty, abnormal_breathing,
// dangerous_environment) doivent rester identiques au backend
// (src/ai/scenarios.ts côté API) : elles pilotent la règle §11.11.
export const QUESTIONS_BY_INCIDENT: Record<IncidentType, SosQuestion[]> = {
  road_accident: [{ key: 'scene_secured', question: 'La zone est-elle sécurisée (circulation, danger) ?' }],
  bleeding: [{ key: 'heavy_bleeding', question: 'Le saignement est-il abondant ou ne s’arrête pas ?' }],
  choking: [{ key: 'can_cough', question: 'La personne peut-elle encore tousser ou parler ?' }],
  burn: [{ key: 'extensive_burn', question: 'La brûlure semble-t-elle étendue ou profonde ?' }],
  malaise: [
    { key: 'conscious', question: 'La personne est-elle consciente ?' },
    { key: 'breathing_difficulty', question: 'Respire-t-elle difficilement ?' },
    { key: 'abnormal_breathing', question: 'Sa respiration semble-t-elle anormale ?' },
    { key: 'dangerous_environment', question: "L'environnement autour d'elle est-il dangereux ?" },
  ],
  fall: [{ key: 'can_move', question: 'La personne peut-elle bouger sans douleur intense ?' }],
  cardiac_arrest: [{ key: 'reacts', question: 'La personne réagit-elle si vous lui parlez ?' }],
  drowning: [{ key: 'safe_to_reach', question: 'La victime est-elle accessible sans danger pour vous ?' }],
};
