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
};
