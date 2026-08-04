// TODO(assets): remplacer ces fichiers par les visuels définitifs
// (mêmes noms, même dossier assets/images/lesson-steps/) — aucun
// changement de code requis ailleurs, seulement le remplacement des
// fichiers. La clé (image_key) est fournie par le backend ; si une
// leçon renvoie une clé absente de cette table, LessonStepCard masque
// simplement l'étape correspondante plutôt que de planter.
export const LESSON_STEP_IMAGES: Record<string, number> = {
  bleeding_protect: require('../../assets/images/lesson-steps/bleeding_protect.jpg'),
  bleeding_locate: require('../../assets/images/lesson-steps/bleeding_locate.jpg'),
  bleeding_compress: require('../../assets/images/lesson-steps/bleeding_compress.jpg'),
  bleeding_maintain: require('../../assets/images/lesson-steps/bleeding_maintain.jpg'),
  bleeding_alert: require('../../assets/images/lesson-steps/bleeding_alert.jpg'),
  choking_position: require('../../assets/images/lesson-steps/choking_position.jpg'),
  choking_back_blows: require('../../assets/images/lesson-steps/choking_back_blows.jpg'),
  choking_abdominal_thrusts: require('../../assets/images/lesson-steps/choking_abdominal_thrusts.jpg'),
  choking_alternate: require('../../assets/images/lesson-steps/choking_alternate.jpg'),
  choking_stop: require('../../assets/images/lesson-steps/choking_stop.jpg'),
  malaise_check: require('../../assets/images/lesson-steps/malaise_check.jpg'),
  malaise_position: require('../../assets/images/lesson-steps/malaise_position.jpg'),
  malaise_reassure: require('../../assets/images/lesson-steps/malaise_reassure.jpg'),
  cardiac_check_reaction: require('../../assets/images/lesson-steps/cardiac_check_reaction.jpg'),
  cardiac_check_breathing: require('../../assets/images/lesson-steps/cardiac_check_breathing.jpg'),
  cardiac_call: require('../../assets/images/lesson-steps/cardiac_call.jpg'),
  cardiac_hand_position: require('../../assets/images/lesson-steps/cardiac_hand_position.jpg'),
  cardiac_compressions: require('../../assets/images/lesson-steps/cardiac_compressions.jpg'),
};
