# Refonte de marque — landing, logo, écran de chargement post-connexion

Date : 2026-07-28

## Contexte

L'app dispose d'une nouvelle identité de marque (planche "Marque" Banani :
fond crème, vert forêt, orange terracotta, badge logo pin+croix, wordmark
"AFRICA"+"SECOURS") qui remplace l'ancienne charte codée dans `theme.ts`
(rouge urgence, bleu confiance, fond gris clair).

Décisions actées avec l'utilisateur :
- La landing vit **dans l'app mobile Expo** (`fristaid-mobile`), pas de site
  web séparé.
- La nouvelle charte remplace les couleurs de **marque** (fond, primaire,
  accent) partout dans l'app.
- Les couleurs **sémantiques de sécurité** (rouge urgence, vert succès,
  orange avertissement, utilisées dans SOS/académie) restent inchangées —
  identité de marque et code couleur de sécurité sont deux choses séparées.
- Aucun fichier logo réel (PNG/SVG exporté) n'est disponible : le logo est
  recréé en vectoriel (`react-native-svg`) à partir des captures d'écran.
  Fidélité visuelle proche, pas pixel-perfect.
- Les assets natifs (icône app, splash natif, favicon web, icône Android
  adaptive dans `app.json`) ne sont **pas** régénérés dans ce lot : ils
  nécessitent les vrais fichiers exportés. Suite à donner, hors périmètre.

## Portée

1. Tokens de marque dans `theme.ts`
2. Composant `Logo` réutilisable (SVG)
3. Écran Landing (`(auth)/welcome.tsx`) comme nouveau point d'entrée
4. Retouche visuelle de l'onboarding existant (pas de changement de logique)
5. Écran de chargement de marque post-connexion, puis redirection vers
   `/(tabs)` (écran d'accueil) — confirmé avec l'utilisateur
6. Petits raccords de cohérence (écrans de garde blancs/gris, en-têtes
   login/register)

## 1. Tokens de marque

Dans `src/constants/theme.ts`, ajouter un objet `brand` à côté de `colors`
(ne pas modifier `colors` existant) :

```ts
export const brand = {
  forest: '#16342A',        // vert forêt — fond héro, logo, boutons foncés
  forestDeep: '#122A22',    // variante plus sombre (pressed states, ombres)
  terracotta: '#C8552C',    // orange accent — CTA, wordmark "SECOURS"
  cream: '#F1ECE0',         // fond landing / onboarding
  creamCard: '#FFFFFF',     // cartes claires sur fond crème
  mutedOnDark: 'rgba(255,255,255,0.55)',  // tagline/texte discret sur vert forêt
  mutedOnLight: '#7C8571',                // tagline/texte discret sur crème
} as const;
```

`theme` (export par défaut) inclut `brand`. Les couleurs sémantiques
existantes (`emergencyRed`, `successGreen`, `warningOrange`, etc.) ne
bougent pas.

## 2. Composant `Logo`

Nouveau fichier `src/components/ui/Logo.tsx`, basé sur `react-native-svg`
(à ajouter aux dépendances si absent).

Exports :
- `LogoMark({ size, variant })` — le badge rond (pin/bouclier + croix dans
  un cercle intérieur). `variant`:
  - `'onCream'` — badge vert forêt, icône orange sur cercle blanc (carte
    claire de la planche de marque)
  - `'onForest'` — badge cercle clair/sourdine, icône orange sur cercle vert
    forêt (carte foncée / écran de chargement)
- `Wordmark({ size, variant })` — texte "AFRICA" + "SECOURS" (deux
  `<Text>` colorés séparément, pas de SVG texte, pour rester net à toutes
  tailles). `variant: 'onCream' | 'onForest'` détermine la couleur de
  "AFRICA" (forêt sur crème / blanc sur forêt) ; "SECOURS" reste toujours
  `brand.terracotta`.
- `LogoLockup({ size, variant, tagline })` — empile `LogoMark` + `Wordmark`
  + tagline optionnelle ("URGENCE · SECOURS · VIE", petites capitales,
  `mutedOnDark`/`mutedOnLight` selon variant).

Aucune dépendance à un fichier image : tout est dessiné en `Svg`/`Path`.

## 3. Écran Landing — nouveau point d'entrée

Nouveau fichier `src/app/(auth)/welcome.tsx` :
- `Screen`-like plein écran, fond `brand.forest` (pas de `Screen mode`
  existant approprié — style direct comme `(auth)/_layout.tsx` fait déjà
  pour ses vues de garde).
- `LogoLockup` centré, `variant="onForest"`, tagline visible.
- Accroche courte (une phrase, ton confiance/urgence).
- CTA primaire terracotta "Commencer" → `router.push('/(auth)/onboarding')`.
- Lien secondaire "J'ai déjà un compte" → même logique que le skip actuel
  de l'onboarding (`markOnboardingSeen()` puis
  `router.replace('/(auth)/login')`).

Routing : dans `src/app/index.tsx`, quand `!token && onboardingSeen ===
false`, rediriger vers `/(auth)/welcome` au lieu de `/(auth)/onboarding`.
`onboarding.tsx` n'est plus atteint directement depuis `index.tsx`, mais
reste joignable depuis `welcome.tsx`.

## 4. Retouche onboarding existant

Dans `(auth)/onboarding.tsx`, uniquement :
- `Screen` fond crème : `Screen` (`src/components/ui/Screen.tsx`) reçoit
  une nouvelle prop optionnelle `backgroundColor` qui, si fournie, remplace
  le fond dérivé de `mode` sur la `SafeAreaView`. `onboarding.tsx` passe
  `backgroundColor={brand.cream}`. Les autres écrans utilisant `Screen`
  sans cette prop ne changent pas de comportement.
- Couleur du lien "Passer" et de `ProgressSegments` : `brand.terracotta`
  au lieu de `colors.trustBlue`.
- Aucun changement de copie, de slides, ni de logique
  (`markOnboardingSeen`, navigation) : cet écran garde son comportement
  actuel à l'identique.

## 5. Écran de chargement post-connexion

Nouveau fichier `src/app/post-auth-loading.tsx` — **en dehors** des
groupes `(auth)` et `(tabs)` pour ne pas être intercepté par la garde de
`(auth)/_layout.tsx` (qui redirige tout accès à `(auth)/*` vers `/(tabs)`
dès que `token` existe).

Comportement :
- Fond `brand.forest` plein écran, `LogoLockup` centré (`variant="onForest"`),
  légende "CHARGEMENT…" avec une animation discrète (points qui pulsent ou
  légère opacité respirante — pas de dépendance nouvelle, `Animated` de
  React Native suffit).
- À l'affichage : attendre un minimum ~900ms (temps perçu volontairement
  soigné, pas un vrai chargement de données — aucun appel réseau
  supplémentaire ici), puis `router.replace('/(tabs)')` → écran d'accueil.
  Confirmé avec l'utilisateur : chargement vert → redirection accueil.

Déclenchement : dans `(auth)/login.tsx` et `(auth)/register.tsx`, juste
après `await signIn(token)`, appeler `router.replace('/post-auth-loading')`
plutôt que de compter sur la redirection automatique de `AuthLayout`.

Portée limitée : ce nouvel écran s'affiche uniquement lors d'une connexion
ou inscription explicite, pas à chaque redémarrage à froid de l'app avec
un token déjà stocké (ce cas reste géré par le splash natif existant, hors
périmètre de ce lot).

## 6. Raccords de cohérence

- `src/app/index.tsx` et `src/app/(auth)/_layout.tsx` : remplacer le fond
  `colors.lightGray` des vues de garde (`isLoading`) par `brand.cream`,
  pour ne plus avoir de flash hors charte pendant la lecture du token
  stocké.
- `login.tsx` et `register.tsx` : ajouter un petit `LogoMark`
  (`variant="onCream"`, taille réduite) au-dessus du titre existant, pour
  garder une continuité de marque sur les écrans d'authentification.

## Hors périmètre (suite à donner)

- Icône d'app, splash natif, favicon web, icône Android adaptive
  (`app.json` + fichiers dans `assets/images/`) : nécessitent les vrais
  fichiers PNG/SVG exportés (Banani ou autre). Dès qu'ils sont fournis,
  le remplacement est mécanique.
- Aucune modification des écrans internes `(tabs)/*`, `(sos)/*`, `kits/*` :
  hors du périmètre demandé (landing, logo, écran de chargement).

## Tests

- Vérification manuelle (pas de suite de tests automatisés existante pour
  l'UI) : lancer `npx expo start`, parcourir
  `welcome → onboarding → register/login → post-auth-loading → (tabs)`,
  et le chemin direct `welcome → J'ai déjà un compte → login →
  post-auth-loading → (tabs)`.
- Vérifier que le rechargement à froid avec un token existant saute bien
  `welcome`/`post-auth-loading` et va directement sur `(tabs)`.
- `npm run typecheck` doit passer.
