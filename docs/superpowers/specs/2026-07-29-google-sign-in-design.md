# Connexion / inscription avec Google

Date : 2026-07-29

## Contexte

L'app propose aujourd'hui uniquement une authentification e-mail + mot de
passe (`POST /auth/register`, `POST /auth/login` côté `fristaid-backend`,
écrans `(auth)/register.tsx` et `(auth)/login.tsx` côté `fristaid-mobile`).
Demande : ajouter la possibilité de s'inscrire/se connecter avec un compte
Google, sur les deux écrans (inscription **et** connexion — sinon un
utilisateur inscrit via Google n'aurait aucun moyen de se reconnecter).

Décisions actées avec l'utilisateur :
- Bouton Google sur `register.tsx` **et** `login.tsx`.
- Bibliothèque : `expo-auth-session` (et son provider Google intégré),
  **pas** `@react-native-google-signin/google-signin`. Raison : le SDK
  natif nécessite un build de développement EAS et casserait la
  compatibilité Expo Go tout juste stabilisée (voir travail réseau/LAN de
  cette session). `expo-auth-session` fonctionne dans Expo Go via un flux
  OAuth navigateur standard.
- Si l'e-mail Google correspond à un compte mot de passe existant : liaison
  automatique (Google authentifie déjà la propriété de l'e-mail), le
  compte devient utilisable avec mot de passe OU Google indifféremment.
- Un seul endpoint backend (`POST /auth/google`) gère connexion,
  inscription et liaison — même contrat de réponse (`{ token, user }`) que
  `/auth/login` et `/auth/register` existants, donc **aucun changement**
  côté navigation/stockage du token mobile (`signIn(token)` →
  `post-auth-loading` → `(tabs)`, identique au flux actuel).

## Portée

1. Migration Prisma : `password_hash` optionnel + `google_id` sur `users`
2. Backend : `POST /auth/google` (vérification du id_token, connexion/
   inscription/liaison), garde sur `/auth/login` pour les comptes
   Google-only
3. Mobile : bouton "Continuer avec Google" sur `register.tsx` et
   `login.tsx`, flux `expo-auth-session`
4. Configuration : nouvelle dépendance, nouvelles variables d'env
   (`GOOGLE_CLIENT_ID` côté mobile et backend), procédure Google Cloud
   Console à exécuter par l'utilisateur (hors périmètre code)

## 1. Schéma de données (`fristaid-backend/prisma/schema.prisma`)

```prisma
model users {
  id            String    @id @default(uuid()) @db.Uuid
  email         String    @unique
  password_hash String?              // ← devient optionnel
  google_id     String?   @unique    // ← nouveau
  role          String    @default("user")
  is_active     Boolean   @default(true)
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt
  // ... relations inchangées
}
```

Migration via `prisma migrate dev` (connexion directe `DIRECT_URL`, comme
toutes les migrations existantes de ce projet — voir `prisma.config.ts`).
Aucune donnée existante n'est perdue : `password_hash` des comptes actuels
reste renseigné, seule la contrainte NOT NULL est levée.

## 2. Backend — `POST /auth/google`

Nouveau fichier `src/routes/authGoogle.ts` (séparé de `auth.ts` pour garder
ce fichier existant focalisé sur le flux mot de passe — `auth.ts` fait déjà
~100 lignes avec 4 endpoints), monté dans `app.ts` à côté de `authRouter`.

Dépendance ajoutée : `google-auth-library` (vérification officielle des
id_token Google côté serveur, gère la récupération/rotation des clés
publiques Google en interne).

Comportement :
1. Body attendu : `{ id_token: string }` (validation zod, cohérent avec
   `loginSchema`/`registerSchema` existants dans `src/validators/auth.ts`).
2. Vérifier le token via
   `client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })`.
   Si invalide/expiré → `401 INVALID_GOOGLE_TOKEN`.
3. Extraire `sub` (id Google stable), `email`, `email_verified`, `name` du
   payload. Si `email_verified` est `false` → `403 EMAIL_NOT_VERIFIED`
   (défensif — Google vérifie toujours en pratique, mais on ne fait pas
   confiance à un e-mail non confirmé pour créer un compte).
4. Recherche dans l'ordre :
   - `users.findUnique({ where: { google_id: sub } })` → trouvé : connexion
     directe (comme la fin de `/auth/login`, sans vérif mot de passe).
   - Sinon `users.findUnique({ where: { email } })` → trouvé : `UPDATE`
     pour renseigner `google_id = sub` sur ce compte existant, puis
     connexion.
   - Sinon : création transactionnelle `users` (`password_hash: null,
     google_id: sub`) + `profiles` (`full_name: name ?? null`) +
     `points_transactions` (100 pts, `reason: 'inscription'`) — même
     logique que la transaction existante dans `/auth/register`
     (`src/routes/auth.ts:32-50`), réutilisée telle quelle avec `full_name`
     issu de Google au lieu du body.
5. Dans tous les cas : `generateDueReminders` (best-effort, comme
   `/auth/login`), puis `signAuthToken(user.id)` et réponse
   `{ token, user: toPublicUser(user, profile) }` — identique au contrat
   des deux endpoints existants.

Garde sur `/auth/login` existant (`src/routes/auth.ts:63-64`) : si
`user.password_hash` est `null`, ne pas appeler `bcrypt.compare` (crash
sur `null`) — répondre `401` avec un message dédié : *"Ce compte utilise
la connexion Google. Utilisez le bouton Google pour vous connecter."*
(code `GOOGLE_ONLY_ACCOUNT`, distinct de `INVALID_CREDENTIALS` pour que le
mobile puisse afficher un message différent).

Variable d'environnement ajoutée à `fristaid-backend/.env` :
`GOOGLE_CLIENT_ID` (le même Client ID Web que côté mobile — voir §4).

## 3. Mobile — bouton et flux OAuth

Nouvelle dépendance : `expo-auth-session` (+ `expo-crypto`, requis en
sous-dépendance pour PKCE — installées via `npx expo install`).

Nouveau fichier `src/lib/googleAuth.ts` : encapsule
`Google.useAuthRequest` (provider intégré
`expo-auth-session/providers/google`) et expose un hook
`useGoogleSignIn({ onSuccess, onError })` qui :
- lance la requête OAuth (scope `openid email profile`),
- à la réception d'une réponse réussie, récupère l'`id_token`,
- appelle `POST /auth/google` (nouvelle fonction `signInWithGoogle
  (id_token)` ajoutée à `src/lib/authApi.ts`, même forme que
  `login`/`registerAccount`),
- retourne `{ token, user }` via `onSuccess`, ou l'erreur via `onError`.

Nouveau composant `src/components/ui/GoogleButton.tsx` : bouton style
`OutlineButton` (bordure, pas de fond), icône Google "G" multicolore en
SVG (`react-native-svg`, déjà une dépendance du projet depuis la refonte
de marque), libellé "Continuer avec Google". Exporté depuis
`@/components/ui`.

Dans `register.tsx` et `login.tsx` : le bouton est inséré sous le bouton
principal existant, séparé par une ligne "ou" (`Text` + deux `View`
diviseurs). Au succès du flux Google, même traitement que le
login/register classique : `await signIn(token); router.replace
('/post-auth-loading')` — aucune branche de navigation nouvelle.

Erreur `GOOGLE_ONLY_ACCOUNT` reçue sur `/auth/login` (mot de passe) :
affichée dans la zone d'erreur existante du formulaire, texte du backend
utilisé tel quel (déjà rédigé pour l'utilisateur final, voir §2).

Variable d'environnement ajoutée à `fristaid-mobile/.env.local` :
`EXPO_PUBLIC_GOOGLE_CLIENT_ID`.

## 4. Prérequis Google Cloud Console (hors périmètre code, à faire par l'utilisateur)

Un **Client ID OAuth de type "Web application"** doit être créé sur
[console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
avant que le flux ne fonctionne. La procédure exacte (URI de redirection
à autoriser, activation de l'écran de consentement OAuth) sera fournie en
fin de plan d'implémentation, une fois le code en place — pas besoin de
bloquer l'écriture du plan là-dessus. Le même Client ID est utilisé côté
mobile (audience du token) et côté backend (vérification).

## Tests

Pas de suite de tests automatisée dans `fristaid-backend` ni
`fristaid-mobile` (confirmé lors des specs précédentes) — vérification
manuelle :
- `npx tsc --noEmit` propre sur les deux projets.
- Backend : `npx prisma migrate dev` appliqué sans erreur, `GET
  /auth/me` avec un token émis par `/auth/google` fonctionne comme avec un
  token classique.
- Mobile : parcours complet inscription via Google (nouveau compte),
  connexion via Google (compte existant), connexion via Google sur un
  e-mail déjà inscrit par mot de passe (vérifie la liaison), puis
  tentative de connexion par mot de passe sur un compte 100% Google
  (vérifie le message d'erreur dédié).

## Hors périmètre

- Déliaison d'un compte Google depuis les réglages du profil (pas demandé).
- Autres fournisseurs OAuth (Apple, Facebook…) — non demandés.
- SDK natif Google Sign-In / build EAS — écarté par décision explicite
  (§Contexte).
