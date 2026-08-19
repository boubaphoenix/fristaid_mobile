import type { CourseType } from '@/components/ui/CourseIcon';

// Copie statique volontaire du contenu de src/ai/scenarios.ts (backend) —
// PRD §11.11/§18 : "les consignes statiques restent toujours accessibles",
// y compris sans compte et sans réseau (écran 03, bouton "Consignes sans
// compte"). Dupliquée ici plutôt qu'exposée via un endpoint public pour
// garantir un accès même hors-ligne, dans le stack (auth) non protégé.
//
// Pour le malaise, on retient volontairement la variante prudente par
// défaut (pas de position demi-assise) : sans les questions de branchement
// (écran 13, qui nécessitent une session), on ne peut pas garantir les
// conditions qui autorisent cette position.
export type EmergencyInstruction = {
  incident: CourseType;
  label: string;
  steps: string[];
  doNotDo: string[];
};

export const EMERGENCY_INSTRUCTIONS: EmergencyInstruction[] = [
  {
    incident: 'bleeding',
    label: 'Hémorragie',
    steps: [
      'Appelez immédiatement les secours.',
      'Comprimez fermement la plaie avec un tissu propre.',
      'Maintenez la pression en continu, sans relâcher.',
      "Surveillez l'état de conscience en attendant les secours.",
    ],
    doNotDo: ['Ne relâchez pas la pression pour vérifier la plaie.', 'Ne retirez pas un objet planté dans la plaie.'],
  },
  {
    incident: 'cardiac_arrest',
    label: 'Arrêt cardiaque',
    steps: [
      'Vérifiez la réaction, puis la respiration.',
      'Appelez ou faites appeler les secours immédiatement.',
      'Suivez précisément leurs consignes au téléphone.',
      "Utilisez un défibrillateur (DAE) s'il est disponible à proximité.",
    ],
    doNotDo: ['Ne pratiquez pas de geste appris sans être formé ou guidé par les secours.'],
  },
  {
    incident: 'drowning',
    label: 'Noyade',
    steps: [
      "N'entrez dans l'eau que si c'est sûr pour vous.",
      'Alertez les secours immédiatement.',
      "Aidez à distance si possible (objet flottant, perche).",
      "Ne prenez en charge la victime que si elle est accessible sans danger.",
    ],
    doNotDo: ['Ne vous mettez jamais en danger pour porter secours.'],
  },
  {
    incident: 'road_accident',
    label: 'Accident de circulation',
    steps: [
      'Sécurisez la zone : feux de détresse, signalisation si possible.',
      'Appelez les secours et donnez une localisation précise.',
      'Ne déplacez pas les blessés, sauf danger immédiat.',
      'Restez avec eux et suivez les consignes des secours au téléphone.',
    ],
    doNotDo: ['Ne déplacez pas une personne blessée sans nécessité.', "Ne restez pas exposé à la circulation."],
  },
  {
    incident: 'choking',
    label: 'Étouffement',
    steps: [
      'Si la personne tousse encore, encouragez-la à continuer.',
      "Si elle ne peut plus tousser, parler ou respirer, appelez les secours immédiatement.",
      'Restez avec elle et suivez les consignes des secours au téléphone.',
    ],
    doNotDo: ["Ne donnez rien à boire à la personne.", 'Ne la laissez pas seule.'],
  },
  {
    incident: 'burn',
    label: 'Brûlure',
    steps: [
      "Refroidissez la brûlure à l'eau tempérée pendant plusieurs minutes.",
      "Retirez les bijoux ou vêtements non collés près de la zone brûlée.",
      "Consultez en urgence si la brûlure est étendue, profonde, ou touche le visage/mains.",
    ],
    doNotDo: ['Ne mettez ni glace ni corps gras sur la brûlure.', 'Ne percez pas les cloques.'],
  },
  {
    incident: 'malaise',
    label: 'Malaise',
    steps: [
      'Appelez les secours immédiatement.',
      'Ne proposez pas de position particulière : suivez les consignes des secours au téléphone.',
      'Restez avec la personne, rassurez-la.',
    ],
    doNotDo: ['Ne proposez pas la position demi-assise sans avis des secours.', 'Ne laissez pas la personne seule.'],
  },
  {
    incident: 'fall',
    label: 'Chute',
    steps: [
      "Demandez si la personne peut bouger et où elle a mal.",
      "En cas de doute (dos, nuque, tête), ne la bougez pas et appelez les secours.",
      "Gardez-la immobile et rassurée en attendant.",
    ],
    doNotDo: ['Ne forcez pas la personne à se relever.', "Ne la mobilisez pas en cas de suspicion de traumatisme."],
  },
  {
    incident: 'avc',
    label: 'AVC',
    steps: [
      "Appelez les secours immédiatement et notez l'heure exacte d'apparition des signes.",
      'Rassurez la personne, ne la laissez pas seule, ne la faites ni boire ni manger.',
      "Même si les signes disparaissent avant l'arrivée des secours, maintenez l'alerte : cela peut être un AIT (mini-AVC).",
    ],
    doNotDo: [
      'Ne donnez jamais d’aspirine ni aucun médicament, même en présence d’une douleur thoracique associée.',
      "N'annulez jamais l'alerte parce que les signes ont disparu.",
    ],
  },
];
