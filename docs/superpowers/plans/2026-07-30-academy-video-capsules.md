# Capsules vidéo YouTube dans l'Académie — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

## Contexte

L'Académie de formation (module leçons) n'affiche aujourd'hui que du texte brut. L'objectif est d'alléger l'apprentissage et de le dynamiser en permettant d'attacher une courte capsule vidéo YouTube (3 minutes max) à une leçon, sans alourdir le bundle de l'app (aucun fichier vidéo local — uniquement un lecteur embed YouTube). Les leçons sans vidéo, le flux de quiz/score, et la validation de complétion de leçon doivent rester strictement inchangés. Le changement touche deux dépôts : `fristaid-backend` (schéma + API) et `fristaid-mobile` (UI).

Deux décisions actées avec l'utilisateur avant ce plan :
- **Librairie** : `react-native-youtube-iframe` (au-dessus de `react-native-webview`) — vérifié via la documentation officielle Expo : `react-native-webview` est *"Included in Expo Go"*, fonctionne sans dev client, aucun plugin de config natif requis. Confirmé aussi pour `react-native-youtube-iframe` (pas de plugin listé dans sa doc).
- **Contenu** : ce plan ajoute uniquement la *capacité* (champs de schéma + support de type dans le seed). Aucun véritable identifiant YouTube n'est codé en dur dans `scripts/seed.ts` — ce sera fait plus tard par l'équipe contenu (édition du seed ou requête SQL manuelle), il n'existe aucun CMS/admin dans ce projet.

La présence d'une vidéo est pilotée uniquement par `youtube_video_id !== null` — pas par le champ `content_type` existant (qui reste un passthrough texte libre, inchangé).

## Architecture

Deux nouvelles colonnes nullable sur `lessons` (`youtube_video_id String?`, `video_duration_seconds Int?`). Le backend les fait simplement transiter dans le mapping existant de `GET /courses/:id/lessons` (pas de nouvel endpoint). Côté mobile, l'écran de leçon affiche un nouveau composant `VideoCapsule` au-dessus du bloc de texte existant uniquement quand `lesson.youtube_video_id` est non-null ; tout le reste (quiz, `handleUnderstood`, points, complétion) reste identique au caractère près.

API confirmée de `react-native-youtube-iframe` (doc officielle) :
- `YoutubePlayer` props : `height` (requis), `width` (optionnel), `videoId`, `play`, `onReady()`, `onChangeState(state)`, `onError(error: string)` — valeurs possibles : `invalid_parameter`, `HTML5_error`, `video_not_found`, `embed_not_allowed`. `webViewProps` transmet au `react-native-webview` sous-jacent (permet de tenter `onError`/`onHttpError` pour les échecs de chargement réseau natifs).
- Pas de sizing responsive intégré — à construire à la main (mesurer la largeur du conteneur via `onLayout`, calculer `height = width * 9 / 16`).
- Un échec réseau pur (hors-ligne) peut ne pas déclencher fiablement `onError` du player (cet événement vient du JS *dans* l'iframe déjà chargée). Le composant ne doit donc pas reposer uniquement sur `onError` : un timeout côté client (8s sans `onReady`) est le filet de sécurité garanti contre un spinner bloquant indéfiniment.

## Contraintes globales (s'appliquent à chaque tâche)

- Deux dépôts : `fristaid-backend` (`C:\Users\DELL\fristaid-backend`) et `fristaid-mobile` (`C:\Users\DELL\fristaid-mobile`). Chaque tâche précise son dépôt.
- Migrations toujours via `npx prisma migrate dev --name <nom>` (jamais de SQL écrit à la main), comme pour toutes les migrations précédentes de ce projet.
- `content_type` reste intouché — aucun branchement dessus, aucun enum introduit.
- Aucun outillage admin/CMS. Aucun identifiant vidéo réel codé en dur dans les 24 leçons de `scripts/seed.ts`.
- `quiz.tsx`, `completeLesson`, `handleUnderstood`, `pointsAwarded`, et la logique du `PrimaryButton` de complétion ne doivent changer dans aucune tâche.
- `radius.card` (8) = rayon maximum absolu de l'app ; aucune `shadows` en dehors de la nav/bouton fixe (blocs plats bordés `colors.border` 1px, idiome `Card`/`StateView`). Réutiliser `spacing`/`typography`/`colors`, jamais de valeurs en dur.
- Vérification : `npx tsc --noEmit` par dépôt (aucun framework de tests dans ni l'un ni l'autre) + vérifications manuelles.
- Alias `@/` → `./src/*` dans `fristaid-mobile`.
- **Exécution recommandée** : comme pour la fonctionnalité Google Sign-In précédente (deux dépôts), utiliser des worktrees git isolées par dépôt (`superpowers:using-git-worktrees`) et `superpowers:subagent-driven-development` — un implémenteur frais par tâche, revu, puis fusionné. Les tâches 1→3 (backend) sont strictement séquentielles (schéma → route → seed). Les tâches 4→6 (mobile) sont aussi séquentielles par dépendance de fichiers, mais indépendantes de l'avancement backend pour le code (la tâche 5 peut être testée isolément avec un `videoId` en dur avant que les données réelles arrivent).

---

### Task 1 — Backend : schéma Prisma, deux nouveaux champs nullable

**Dépôt :** `fristaid-backend`
**Fichiers :** `prisma/schema.prisma`, nouvelle migration générée sous `prisma/migrations/`

1. Modifier le modèle `lessons` — insérer deux lignes après `content_type` :
```prisma
model lessons {
  id                     String   @id @default(uuid()) @db.Uuid
  course_id              String   @db.Uuid
  title                  String
  content                String
  content_type           String   @default("text")
  youtube_video_id       String?
  video_duration_seconds Int?
  sort_order             Int
  is_required            Boolean  @default(true)
  created_at             DateTime @default(now())
  updated_at             DateTime @updatedAt

  course courses @relation(fields: [course_id], references: [id])

  @@index([course_id])
}
```
2. `npx prisma migrate dev --name add_video_fields_to_lessons` — attendre une migration additive simple (deux `ADD COLUMN` nullable, pas de bloc `Warnings`, comme pour `avatar_url`).
3. `npx prisma generate` puis `npx tsc --noEmit` — doit être propre.
4. Commit.

---

### Task 2 — Backend : exposer les deux champs sur `GET /courses/:id/lessons`

**Dépôt :** `fristaid-backend`
**Fichiers :** `src/routes/courses.ts`
**Dépend de :** Task 1

Dans le mapping inline des leçons (route `GET /courses/:id/lessons`, ~ligne 118), ajouter les deux champs :
```ts
lessons: lessons.map((lesson) => ({
  id: lesson.id,
  title: lesson.title,
  content: lesson.content,
  content_type: lesson.content_type,
  youtube_video_id: lesson.youtube_video_id,
  video_duration_seconds: lesson.video_duration_seconds,
  sort_order: lesson.sort_order,
  is_required: lesson.is_required,
  completed: completedIds.has(lesson.id),
})),
```
`prisma.lessons.findMany` récupère déjà la ligne complète (pas de `select`) — aucune autre modification de requête nécessaire. `npx tsc --noEmit` propre. Commit.

---

### Task 3 — Backend : support de type dans le seed (sans peupler de contenu)

**Dépôt :** `fristaid-backend`
**Fichiers :** `scripts/seed.ts`
**Dépend de :** Task 1

1. Étendre `LessonSeed` :
```ts
type LessonSeed = { title: string; content: string; youtube_video_id?: string; video_duration_seconds?: number };
```
2. Dans le mapping de création des leçons à l'intérieur de `main()`, faire transiter les champs optionnels :
```ts
lessons: {
  create: course.lessons.map((lesson, index) => ({
    title: lesson.title,
    content: lesson.content,
    youtube_video_id: lesson.youtube_video_id ?? null,
    video_duration_seconds: lesson.video_duration_seconds ?? null,
    sort_order: index + 1,
  })),
},
```
3. Ne toucher à aucun des 24 littéraux de leçons dans `COURSES` — ils omettent simplement les nouvelles clés optionnelles, le `?? null` préserve le comportement actuel à l'identique.
4. `npx tsc --noEmit` propre. Commit.

---

### Task 4 — Mobile : dépendances + type `Lesson`

**Dépôt :** `fristaid-mobile`
**Fichiers :** `package.json` (+ lockfile), `src/lib/coursesApi.ts`
**Dépend de :** aucune (peut démarrer immédiatement)

1. `npx expo install react-native-webview react-native-youtube-iframe`. Aucune entrée `app.json` → `plugins` requise pour l'un ou l'autre paquet (confirmé sur la doc officielle) — ne pas en ajouter.
2. Étendre le type `Lesson` dans `coursesApi.ts` :
```ts
export type Lesson = {
  id: string;
  title: string;
  content: string;
  content_type: string;
  youtube_video_id: string | null;
  video_duration_seconds: number | null;
  sort_order: number;
  is_required: boolean;
  completed: boolean;
};
```
(Champs non-optionnels mais nullables — le backend renvoie toujours les clés depuis la Tâche 2, jamais `undefined`.)
3. `npx tsc --noEmit` propre. Commit.

---

### Task 5 — Mobile : composant `VideoCapsule`

**Dépôt :** `fristaid-mobile`
**Fichiers :** nouveau `src/components/ui/VideoCapsule.tsx`, `src/components/ui/index.ts`
**Dépend de :** Tâche 4

**Conception :**
- Props : `{ videoId: string; durationSeconds?: number | null }`.
- `formatDuration(seconds)` → `` `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` `` (ex. `2:30`). En-tête : `"Capsule Vidéo"` seul si `durationSeconds` est absent, sinon `"Capsule Vidéo • 2:30 min"` — jamais afficher "null min".
- Conteneur externe : bloc plat bordé (idiome `Card`/`StateView`) — `borderWidth: 1`, `borderColor: colors.border`, `borderRadius: radius.card`, `overflow: 'hidden'`, `backgroundColor: colors.white`. Pas de `shadows`.
- Ligne d'en-tête : `typography.small`/`caption`, `color: colors.mutedText`, padding `spacing.sm`/`spacing.md`, séparateur bas 1px `colors.border`.
- Zone lecteur : `View` avec `onLayout` pour mesurer la largeur, initialiser via `Dimensions.get('window').width - spacing.screenPadding * 2 - 2` pour éviter un premier rendu à hauteur 0. `height = Math.round(width * 9 / 16)`.
- Machine à 3 états (`useState<'loading' | 'ready' | 'error'>('loading')`) :
  - **loading** : skeleton `View` (`{ width, height }`, `backgroundColor: colors.border`, `radius.card`) superposé en `position: absolute` par-dessus le `YoutubePlayer` (qui est monté dès le départ pour pouvoir charger et déclencher `onReady` pendant que le skeleton le masque — évite un remount).
  - **ready** : skeleton masqué, `YoutubePlayer` visible, `play={false}` (pas d'autoplay, aucun ref/contrôle local nécessaire).
  - **error** : remplace toute la zone par une carte de repli façon `StateView` `ErrorState` — `backgroundColor: colors.warningBg`, `borderColor: colors.warningOrange`, `borderWidth: 1`, `radius.card`, `padding: spacing.md`, texte `typography.body`/`colors.darkText`, contenu exact : **"Vidéo indisponible hors-ligne — lisez le cours ci-dessous"**.
- Câblage `YoutubePlayer` : `videoId`, `height`, `width` (rendu uniquement si `width > 0`), `onReady` → `clearTimeout` + `setStatus('ready')`, `onError` → `setStatus('error')`, `webViewProps={{ onError: () => setStatus('error'), onHttpError: () => setStatus('error') }}` (best-effort, pas garanti selon plateforme — commentaire de code l'explique).
- **Filet de sécurité obligatoire** : au montage (et à chaque changement de `videoId`), `setTimeout(() => setStatus((s) => (s === 'loading' ? 'error' : s)), 8000)`, stocké en ref, nettoyé dans `onReady` et au démontage (`useEffect` cleanup). C'est ce qui garantit qu'il n'y a jamais de spinner bloquant indéfiniment, indépendamment de la fiabilité des callbacks d'erreur de la librairie.
- Exporter depuis `src/components/ui/index.ts` : `export { VideoCapsule } from './VideoCapsule';`.
- `npx tsc --noEmit` propre. Test manuel isolé (ligne jetable temporaire du style `<VideoCapsule videoId="jNQXAC9IVRw" durationSeconds={19} />` dans un écran existant, retirée avant commit) pour confirmer le rendu avant l'intégration à l'écran de leçon.
- Commit.

---

### Task 6 — Mobile : intégration dans l'écran de leçon

**Dépôt :** `fristaid-mobile`
**Fichiers :** `src/app/(tabs)/academy/[courseId]/lesson/[lessonId].tsx`
**Dépend de :** Task 4 (type), Task 5 (composant)

1. Ajouter `VideoCapsule` à l'import existant depuis `@/components/ui`.
2. Insérer le rendu conditionnel juste après le titre et avant le bloc `ChevronStrip`/texte existant (ligne 82-84 actuelle) :
```tsx
<Text style={[typography.h2, styles.spaced]}>{lesson.title}</Text>

{lesson.youtube_video_id ? (
  <View style={styles.spaced}>
    <VideoCapsule videoId={lesson.youtube_video_id} durationSeconds={lesson.video_duration_seconds} />
  </View>
) : null}

<View style={styles.spaced}>
  <ChevronStrip />
  <View style={styles.retainBlock}>
    <Text style={[typography.body, styles.retainText]}>{lesson.content}</Text>
  </View>
  <ChevronStrip />
</View>
```
3. Ne pas toucher à `handleUnderstood`, l'appel `completeLesson`, l'état `pointsAwarded`, ni les props du `PrimaryButton` — aucune ligne de ces zones ne fait partie de ce diff.
4. `npx tsc --noEmit` propre. Commit.

---

## Vérification de bout en bout (manuelle — aucun framework de test dans les deux dépôts)

1. **Non-régression d'abord** : sans donnée de seed modifiée, toute leçon existante a `youtube_video_id = null` → chaque écran de leçon doit rendre à l'identique d'avant (pas de `VideoCapsule`, pas de décalage de mise en page). À vérifier juste après la Tâche 6, avant tout identifiant vidéo réel.
2. **Activer une vidéo sur une seule leçon** via une requête SQL manuelle sur la base de dev (pas via le seed, qui doit rester libre de contenu en dur) :
```sql
UPDATE lessons SET youtube_video_id = 'jNQXAC9IVRw', video_duration_seconds = 19 WHERE id = '<uuid-leçon-test>';
```
(`jNQXAC9IVRw` = "Me at the zoo", première vidéo YouTube jamais publiée, 19s, publique/officielle, toujours embarquable — pratique pour un test rapide ; à retirer après test, ce n'est pas du contenu final.)
3. `npx expo start --web` d'abord (itération rapide) : confirmer le skeleton bref puis le lecteur au bon ratio 16:9 plafonné à `radius.card`, le libellé "Capsule Vidéo • 0:19 min", le texte de la leçon toujours affiché en dessous à l'identique, et le `PrimaryButton`/`pointsAwarded` toujours fonctionnels.
4. Puis sur un vrai téléphone via Expo Go (le comportement de `react-native-webview` diffère de web) — confirmer le même rendu.
5. **Déclencher le repli d'erreur**, deux façons :
   - Le plus simple/fiable : mettre temporairement un `youtube_video_id` invalide (ex. `'not-a-real-id'`) → doit déclencher `onError` (`video_not_found`/`invalid_parameter`) et afficher la carte de repli.
   - Hors-ligne réel : mode avion sur l'appareil avant d'ouvrir la leçon → la carte de repli doit apparaître sous ~8s (via le timeout, indépendamment des callbacks natifs), et le texte de la leçon + le bouton "J'ai compris" doivent rester pleinement utilisables (la complétion de leçon en elle-même a déjà sa propre gestion d'erreur réseau préexistante, non modifiée par cette fonctionnalité).
6. Remettre `youtube_video_id`/`video_duration_seconds` à `NULL` sur la leçon de test une fois satisfait, pour ne pas laisser de contenu de test dans une base de dev partagée.

## Fichiers critiques

- `C:\Users\DELL\fristaid-backend\prisma\schema.prisma`
- `C:\Users\DELL\fristaid-backend\src\routes\courses.ts`
- `C:\Users\DELL\fristaid-backend\scripts\seed.ts`
- `C:\Users\DELL\fristaid-mobile\src\lib\coursesApi.ts`
- `C:\Users\DELL\fristaid-mobile\src\components\ui\VideoCapsule.tsx` (nouveau)
- `C:\Users\DELL\fristaid-mobile\src\app\(tabs)\academy\[courseId]\lesson\[lessonId].tsx`
- `C:\Users\DELL\fristaid-mobile\src\components\ui\StateView.tsx` (référence de style uniquement, non modifié)
