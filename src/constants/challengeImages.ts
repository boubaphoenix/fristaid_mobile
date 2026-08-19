// Même patron que lessonStepImages.ts : une clé absente de cette table
// masque simplement l'image côté écran de défi plutôt que de planter —
// aucune image distante/CDN, uniquement des assets locaux bundlés.
// Pour ajouter une image de défi "reconnaissance visuelle", ajouter le
// fichier sous assets/images/challenges/ et une ligne ici avec la même clé
// que le `image_key` renvoyé par le backend.
export const CHALLENGE_IMAGES: Record<string, number> = {};
