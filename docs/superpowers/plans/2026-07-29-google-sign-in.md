# Google Sign-In / Sign-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Continuer avec Google" option to both the login and register screens, backed by a single backend endpoint that transparently handles Google sign-up, sign-in, and automatic linking to an existing password account by verified e-mail.

**Architecture:** Mobile uses `expo-auth-session`'s Google provider (Expo Go-compatible, no native SDK) to obtain a Google ID token via an in-app browser popup, then POSTs it to a new `POST /auth/google` backend endpoint. The backend verifies the token with `google-auth-library`, then finds-or-creates the user and returns the exact same `{ token, user }` shape as the existing `/auth/login` and `/auth/register` endpoints — so the mobile app's post-auth flow (`signIn(token)` → `/post-auth-loading` → `(tabs)`) needs no changes.

**Tech Stack:** `google-auth-library` (backend, Google ID token verification), `expo-auth-session` + `expo-crypto` (mobile, OAuth flow), Prisma migration (schema change), `react-native-svg` (Google "G" glyph, already a project dependency).

## Global Constraints

- Two repos: `fristaid-backend` (Express/Prisma/Neon) and `fristaid-mobile` (Expo Router). Every task states which repo it's in.
- No native Google Sign-In SDK — `expo-auth-session` only, to keep the app testable via Expo Go (decided during design; ejecting to a custom dev client is explicitly out of scope).
- `password_hash` on `users` becomes optional (`String?`) — Google-only accounts have no password. Do not remove or change the meaning of any other existing column.
- The backend must **boot successfully even when `GOOGLE_CLIENT_ID` is not yet configured** (the user does not have Google Cloud credentials at the time of this plan) — `/auth/google` alone returns a clear "not configured" error in that case; every other route (including the existing `/auth/login`, `/auth/register`) must keep working unmodified.
- Neither repo has an automated test framework. Verification is `npx tsc --noEmit` (run from each repo's root) plus manual checks. Do not invent a test runner that isn't configured.
- Response contract for `/auth/google` must exactly match the existing `/auth/login`/`/auth/register` contract: `{ token: string, user: <same shape as toPublicUser> }` on success, `{ error: { code, message } }` on failure (via the existing `AppError`/`errorHandler` mechanism).
- Path alias `@/` resolves to `./src/*` in `fristaid-mobile` (tsconfig.json).
- Follow existing patterns: Prisma migrations via `npx prisma migrate dev --name <name>` (never hand-write migration SQL), zod for request validation, `AppError` for all thrown API errors, `apiFetch<T>()` for all mobile API calls.

---

### Task 1: Prisma schema — nullable `password_hash` + `google_id`

**Files:**
- Modify: `fristaid-backend/prisma/schema.prisma`

**Interfaces:**
- Produces: `users.password_hash: String?` (was `String`), `users.google_id: String? @unique` (new column). Both consumed by Task 2.

- [ ] **Step 1: Edit the `users` model**

In `fristaid-backend/prisma/schema.prisma`, find the `users` model (starts with `model users {`). Change this line:

```prisma
  password_hash String
```

to:

```prisma
  password_hash String?
```

Then add a new line directly below it:

```prisma
  google_id     String?   @unique
```

The model should now start:

```prisma
model users {
  id            String    @id @default(uuid()) @db.Uuid
  email         String    @unique
  password_hash String?
  google_id     String?   @unique
  role          String    @default("user")
  is_active     Boolean   @default(true)
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt
```

(everything below `updated_at` — the relations and `@@index` — is unchanged)

- [ ] **Step 2: Generate and apply the migration**

Run from `fristaid-backend`:

```bash
npx prisma migrate dev --name make_password_optional_add_google_id
```

Expected: a new folder appears under `fristaid-backend/prisma/migrations/` (timestamped, ending in `_make_password_optional_add_google_id`), and the command reports the migration applied successfully against the Neon database (uses `DIRECT_URL` per `prisma.config.ts`, same as every prior migration in this project).

- [ ] **Step 3: Regenerate the Prisma client and typecheck**

```bash
npx prisma generate
npx tsc --noEmit
```

Expected: no errors. (This will surface everywhere `password_hash` is used as a plain `string` — Task 2 fixes the one real usage in `src/routes/auth.ts`.)

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Make password_hash optional and add google_id to users"
```

---

### Task 2: Backend — `POST /auth/google` endpoint

**Files:**
- Modify: `fristaid-backend/package.json` (add `google-auth-library` dependency)
- Create: `fristaid-backend/src/routes/authGoogle.ts`
- Modify: `fristaid-backend/src/app.ts` (mount the new router)
- Modify: `fristaid-backend/src/routes/auth.ts` (guard `/auth/login` against Google-only accounts)
- Modify: `fristaid-backend/.env.example`, `fristaid-backend/.env`

**Interfaces:**
- Consumes: `users.password_hash: String?`, `users.google_id: String?` (Task 1); `AppError` (`src/lib/errors.ts`), `signAuthToken` (`src/lib/jwt.ts`), `prisma` (`src/lib/prisma.ts`), `authRateLimit` (`src/middleware/authRateLimit.ts`), `toPublicUser`/`getUserWithProfile` (`src/services/profile.ts`), `generateDueReminders` (`src/services/reminders.ts`).
- Produces: route `POST /auth/google` returning `{ token, user }` on success (same shape as `/auth/login`); error code `GOOGLE_AUTH_NOT_CONFIGURED` (503) when `GOOGLE_CLIENT_ID` is unset, `INVALID_GOOGLE_TOKEN` (401), `EMAIL_NOT_VERIFIED` (403), `ACCOUNT_DISABLED` (403); new error code `GOOGLE_ONLY_ACCOUNT` (401) from `/auth/login`.

- [ ] **Step 1: Add the `google-auth-library` dependency**

Run from `fristaid-backend`:

```bash
npm install google-auth-library
```

- [ ] **Step 2: Create `fristaid-backend/src/routes/authGoogle.ts`**

```ts
import { OAuth2Client } from 'google-auth-library';
import { Router } from 'express';
import { z } from 'zod';

import { AppError } from '../lib/errors';
import { signAuthToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import { authRateLimit } from '../middleware/authRateLimit';
import { toPublicUser } from '../services/profile';
import { generateDueReminders } from '../services/reminders';

export const authGoogleRouter = Router();

const REGISTRATION_BONUS_POINTS = 100;

// GOOGLE_CLIENT_ID est optionnel au démarrage (contrairement à
// JWT_SECRET) : tant que les identifiants Google Cloud ne sont pas
// configurés, le reste de l'API doit continuer à fonctionner — seul cet
// endpoint répond "non configuré".
const googleClientId = process.env.GOOGLE_CLIENT_ID || null;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

const googleAuthSchema = z.object({
  id_token: z.string().min(1),
});

authGoogleRouter.post('/auth/google', authRateLimit, async (req, res) => {
  if (!googleClient || !googleClientId) {
    throw new AppError(
      503,
      'GOOGLE_AUTH_NOT_CONFIGURED',
      "La connexion Google n'est pas configurée sur ce serveur.",
    );
  }

  const parsed = googleAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Jeton Google manquant.');
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: parsed.data.id_token,
      audience: googleClientId,
    });
    payload = ticket.getPayload();
  } catch {
    throw new AppError(401, 'INVALID_GOOGLE_TOKEN', 'Jeton Google invalide ou expiré.');
  }

  if (!payload?.sub || !payload.email) {
    throw new AppError(401, 'INVALID_GOOGLE_TOKEN', 'Jeton Google invalide ou expiré.');
  }
  if (!payload.email_verified) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', "L'e-mail Google n'est pas vérifié.");
  }

  const googleId = payload.sub;
  const email = payload.email.toLowerCase();
  const fullName = payload.name ?? null;

  let user = await prisma.users.findUnique({ where: { google_id: googleId } });

  if (!user) {
    const existingByEmail = await prisma.users.findUnique({ where: { email } });
    if (existingByEmail) {
      user = await prisma.users.update({
        where: { id: existingByEmail.id },
        data: { google_id: googleId },
      });
    }
  }

  let profile;
  if (user) {
    profile = await prisma.profiles.findUnique({ where: { user_id: user.id } });
    if (!profile) {
      throw new AppError(500, 'PROFILE_MISSING', 'Profil introuvable pour ce compte.');
    }
  } else {
    const created = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.users.create({
        data: { email, google_id: googleId, password_hash: null },
      });
      const createdProfile = await tx.profiles.create({
        data: {
          user_id: createdUser.id,
          full_name: fullName,
          points_total: REGISTRATION_BONUS_POINTS,
        },
      });
      await tx.points_transactions.create({
        data: {
          user_id: createdUser.id,
          amount: REGISTRATION_BONUS_POINTS,
          reason: 'inscription',
        },
      });
      return { user: createdUser, profile: createdProfile };
    });
    user = created.user;
    profile = created.profile;
  }

  if (!user.is_active) {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'Ce compte est désactivé.');
  }

  await generateDueReminders(user.id).catch(() => {});

  const token = signAuthToken(user.id);
  res.json({ token, user: toPublicUser(user, profile) });
});
```

- [ ] **Step 3: Mount the router in `fristaid-backend/src/app.ts`**

Add the import next to the other route imports (alphabetical, matches existing order):

```ts
import { authGoogleRouter } from './routes/authGoogle';
```

Add the mount line directly after `app.use(authRouter);`:

```ts
  app.use(authRouter);
  app.use(authGoogleRouter);
```

- [ ] **Step 4: Guard `/auth/login` against Google-only accounts**

In `fristaid-backend/src/routes/auth.ts`, inside the `/auth/login` handler, replace:

```ts
  const user = await prisma.users.findUnique({ where: { email } });
  const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false;
```

with:

```ts
  const user = await prisma.users.findUnique({ where: { email } });

  if (user && user.password_hash === null) {
    throw new AppError(
      401,
      'GOOGLE_ONLY_ACCOUNT',
      'Ce compte utilise la connexion Google. Utilisez le bouton Google pour vous connecter.',
    );
  }

  const passwordMatches =
    user && user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
```

- [ ] **Step 5: Add `GOOGLE_CLIENT_ID` to env files**

In `fristaid-backend/.env.example`, add at the end:

```
# Google Sign-In — Client ID OAuth "Web application" (Google Cloud
# Console). Tant que vide, POST /auth/google repond 503
# GOOGLE_AUTH_NOT_CONFIGURED, le reste de l'API fonctionne normalement.
GOOGLE_CLIENT_ID=""
```

In `fristaid-backend/.env`, add the same line with an empty value (`GOOGLE_CLIENT_ID=""`) — leave it empty; the exact value is filled in later per the Google Cloud Console setup instructions at the end of this plan.

- [ ] **Step 6: Typecheck**

Run from `fristaid-backend`:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Manual check — server still boots with `GOOGLE_CLIENT_ID` empty**

```bash
npm run dev
```

Expected: `AFRICASECOUR API listening on http://localhost:4000` (same as before, no crash). Then, in another terminal:

```bash
curl -s -X POST http://localhost:4000/auth/google -H "Content-Type: application/json" -d "{\"id_token\":\"x\"}"
```

Expected: `{"error":{"code":"GOOGLE_AUTH_NOT_CONFIGURED","message":"La connexion Google n'est pas configurée sur ce serveur."}}`. Also confirm the existing flow still works: `curl -s http://localhost:4000/` returns `{"name":"AFRICASECOUR API","status":"ok"}`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/routes/authGoogle.ts src/app.ts src/routes/auth.ts .env.example
git commit -m "Add POST /auth/google endpoint (sign-in, sign-up, account linking)"
```

(`.env` is gitignored, not committed — verify with `git status` that it does not appear staged.)

---

### Task 3: Mobile — Google auth hook, API call, and `GoogleButton` component

**Files:**
- Modify: `fristaid-mobile/package.json` (add `expo-auth-session`, `expo-crypto`)
- Modify: `fristaid-mobile/src/lib/authApi.ts` (add `signInWithGoogle`)
- Create: `fristaid-mobile/src/lib/googleAuth.ts`
- Create: `fristaid-mobile/src/components/ui/GoogleButton.tsx`
- Modify: `fristaid-mobile/src/components/ui/index.ts`
- Modify: `fristaid-mobile/.env.local`

**Interfaces:**
- Consumes: `apiFetch`/`AuthResponse` shape (`src/lib/api.ts`, `src/lib/authApi.ts`); `colors`, `radius`, `sizes`, `spacing`, `typography` (`@/constants/theme`).
- Produces: `signInWithGoogle(id_token: string): Promise<{ token: string; user: AuthUser }>` from `@/lib/authApi`; `useGoogleSignIn(onIdToken: (idToken: string) => void, onError: (message: string) => void): { promptAsync: () => void; isReady: boolean }` from `@/lib/googleAuth`; `GoogleButton({ onPress, disabled?, style? })` exported from `@/components/ui`. Both consumed by Task 4.

- [ ] **Step 1: Install the OAuth dependencies**

Run from `fristaid-mobile`:

```bash
npx expo install expo-auth-session expo-crypto
```

(`expo-web-browser` is already a dependency — no need to add it.)

- [ ] **Step 2: Add `signInWithGoogle` to `fristaid-mobile/src/lib/authApi.ts`**

Add this function to the file, next to `login`/`registerAccount`:

```ts
export function signInWithGoogle(id_token: string) {
  return apiFetch<AuthResponse>('/auth/google', {
    method: 'POST',
    body: { id_token },
  });
}
```

- [ ] **Step 3: Create `fristaid-mobile/src/lib/googleAuth.ts`**

```ts
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

// Ne fonctionne que si EXPO_PUBLIC_GOOGLE_CLIENT_ID est renseigné (voir
// .env.local) — sinon `request` reste null et isReady est false, le
// bouton Google reste désactivé sans planter l'app (voir plan §Google
// Cloud Console pour obtenir un Client ID).
export function useGoogleSignIn(
  onIdToken: (idToken: string) => void,
  onError: (message: string) => void,
) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    responseType: 'id_token',
    scopes: ['openid', 'email', 'profile'],
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success' && response.authentication?.idToken) {
      onIdToken(response.authentication.idToken);
    } else if (response.type === 'success') {
      onError('Réponse Google invalide, réessayez.');
    } else if (response.type === 'error') {
      onError('La connexion Google a échoué, réessayez.');
    }
    // response.type === 'cancel' / 'dismiss' : l'utilisateur a fermé la
    // popup volontairement, pas une erreur à afficher.
  }, [response]);

  return { promptAsync: () => promptAsync(), isReady: Boolean(request) };
}
```

- [ ] **Step 4: Create `fristaid-mobile/src/components/ui/GoogleButton.tsx`**

```tsx
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radius, sizes, spacing, typography } from '@/constants/theme';

type GoogleButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function GoogleButton({ onPress, disabled = false, style }: GoogleButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continuer avec Google"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
        style,
      ]}>
      <GoogleGlyph size={20} />
      <Text style={[typography.bodyBold, styles.label]}>Continuer avec Google</Text>
    </Pressable>
  );
}

function GoogleGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z"
      />
      <Path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 16.3 3 9.7 7.3 6.3 14.7z"
      />
      <Path
        fill="#4CAF50"
        d="M24 45c5.4 0 10.3-1.8 14.1-5l-6.5-5.5C29.6 36.1 26.9 37 24 37c-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.6 40.6 16.3 45 24 45z"
      />
      <Path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.5 5.5C40.9 36.9 45 31 45 24c0-1.4-.1-2.7-.4-3.5z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  base: {
    height: sizes.touchMin,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    color: colors.darkText,
  },
});
```

- [ ] **Step 5: Export from the UI barrel**

In `fristaid-mobile/src/components/ui/index.ts`, add:

```ts
export { GoogleButton } from './GoogleButton';
```

- [ ] **Step 6: Add the Google Client ID placeholder to `.env.local`**

In `fristaid-mobile/.env.local`, add:

```
# Google Sign-In — même Client ID "Web application" que GOOGLE_CLIENT_ID
# côté backend (fristaid-backend/.env). Vide = bouton Google désactivé
# sans planter l'app (voir googleAuth.ts).
EXPO_PUBLIC_GOOGLE_CLIENT_ID=
```

- [ ] **Step 7: Typecheck**

Run from `fristaid-mobile`:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/lib/authApi.ts src/lib/googleAuth.ts src/components/ui/GoogleButton.tsx src/components/ui/index.ts
git commit -m "Add Google auth hook, API call, and GoogleButton component"
```

(`.env.local` is gitignored — verify with `git status` it's not staged.)

---

### Task 4: Mobile — wire `GoogleButton` into login and register screens

**Files:**
- Modify: `fristaid-mobile/src/app/(auth)/login.tsx`
- Modify: `fristaid-mobile/src/app/(auth)/register.tsx`

**Interfaces:**
- Consumes: `GoogleButton` (Task 3), `useGoogleSignIn` (Task 3), `signInWithGoogle` (Task 3), existing `signIn`/`router.replace('/post-auth-loading')` pattern (unchanged from current login/register logic).

- [ ] **Step 1: Wire Google sign-in into `login.tsx`**

In `fristaid-mobile/src/app/(auth)/login.tsx`, update the imports:

```ts
import { GoogleButton, LogoMark, OutlineButton, PrimaryButton, Screen, TextField } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { login, signInWithGoogle } from '@/lib/authApi';
import { useGoogleSignIn } from '@/lib/googleAuth';
```

Add new state right after the existing `isSubmitting` state:

```ts
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
```

Add the hook call and handler, right after the existing `handleSubmit` function:

```ts
  const { promptAsync, isReady } = useGoogleSignIn(
    async (idToken) => {
      setGoogleError(null);
      setIsGoogleSubmitting(true);
      try {
        const { token } = await signInWithGoogle(idToken);
        await signIn(token);
        router.replace('/post-auth-loading');
      } catch (err) {
        setGoogleError(
          err instanceof ApiError ? err.message : 'Impossible de se connecter avec Google pour le moment.',
        );
      } finally {
        setIsGoogleSubmitting(false);
      }
    },
    (message) => setGoogleError(message),
  );
```

Insert the divider, `GoogleButton`, and error text right after the closing `<PrimaryButton .../>` tag and before `<Link href="/(auth)/register">`:

```tsx
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={[typography.small, styles.dividerText]}>ou</Text>
        <View style={styles.dividerLine} />
      </View>
      <GoogleButton
        onPress={promptAsync}
        disabled={!isReady || isSubmitting || isGoogleSubmitting}
        style={styles.spaced}
      />
      {googleError ? (
        <Text style={[typography.small, styles.googleError, styles.spaced]}>{googleError}</Text>
      ) : null}
```

Also update the existing `<PrimaryButton disabled={...}>` to also disable while Google sign-in is in progress:

```tsx
      <PrimaryButton
        label={isSubmitting ? 'Connexion...' : 'Se connecter'}
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!email || !password || isGoogleSubmitting}
        style={styles.spaced}
      />
```

Add the new styles to the `StyleSheet.create` block at the bottom of the file:

```ts
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.mutedText,
  },
  googleError: {
    color: colors.emergencyRed,
  },
```

- [ ] **Step 2: Wire Google sign-in into `register.tsx`**

In `fristaid-mobile/src/app/(auth)/register.tsx`, update the imports:

```ts
import { GoogleButton, LogoMark, PointsBadge, PrimaryButton, Screen, TextField } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { registerAccount, signInWithGoogle } from '@/lib/authApi';
import { useGoogleSignIn } from '@/lib/googleAuth';
```

Add new state right after the existing `isSubmitting` state:

```ts
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
```

Add the hook call and handler, right after the existing `handleSubmit` function:

```ts
  const { promptAsync, isReady } = useGoogleSignIn(
    async (idToken) => {
      setGoogleError(null);
      setIsGoogleSubmitting(true);
      try {
        const { token } = await signInWithGoogle(idToken);
        await signIn(token);
        router.replace('/post-auth-loading');
      } catch (err) {
        setGoogleError(
          err instanceof ApiError ? err.message : 'Impossible de continuer avec Google pour le moment.',
        );
      } finally {
        setIsGoogleSubmitting(false);
      }
    },
    (message) => setGoogleError(message),
  );
```

Insert the divider, `GoogleButton`, and error text right after the closing `<PrimaryButton .../>` tag and before `<Link href="/(auth)/login">`:

```tsx
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={[typography.small, styles.dividerText]}>ou</Text>
        <View style={styles.dividerLine} />
      </View>
      <GoogleButton
        onPress={promptAsync}
        disabled={!isReady || isSubmitting || isGoogleSubmitting}
        style={styles.spaced}
      />
      {googleError ? (
        <Text style={[typography.small, styles.googleError, styles.spaced]}>{googleError}</Text>
      ) : null}
```

Also update the existing `<PrimaryButton disabled={...}>` to also disable while Google sign-in is in progress:

```tsx
      <PrimaryButton
        label={isSubmitting ? 'Création...' : 'Créer mon compte'}
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!canSubmit || isGoogleSubmitting}
        style={styles.spaced}
      />
```

Add the new styles to the `StyleSheet.create` block at the bottom of the file:

```ts
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.mutedText,
  },
  googleError: {
    color: colors.emergencyRed,
  },
```

- [ ] **Step 3: Typecheck**

Run from `fristaid-mobile`:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual check — button renders disabled without credentials**

Run `npx expo start --web` (from `fristaid-mobile`, with `fristaid-backend`'s `npm run dev` also running). Open `/login` and `/register`. Expected: both screens show a "ou" divider and a greyed-out (disabled, ~50% opacity) "Continuer avec Google" button below the main action button — disabled because `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is still empty at this point in the plan. Confirm the rest of each screen (existing fields, existing button) still works exactly as before.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/login.tsx" "src/app/(auth)/register.tsx"
git commit -m "Add Google sign-in button to login and register screens"
```

---

## Google Cloud Console setup (manual, done by the user — not a code task)

Once all four tasks above are merged, the "Continuer avec Google" buttons will render but stay disabled until real credentials are configured. To activate them:

1. Go to [console.cloud.google.com](https://console.cloud.google.com/), create a project if you don't have one (or reuse an existing one).
2. Go to **APIs & Services → OAuth consent screen**. Choose **External**, fill in the app name ("AFRICASECOUR"), your support e-mail, and save (test mode is fine while developing).
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
4. Application type: **Web application**.
5. Under **Authorized redirect URIs**, add: `https://auth.expo.io/@your-expo-username/fristaid-mobile` (replace `your-expo-username` with the Expo account username used for this project — run `npx expo whoami` from `fristaid-mobile` to check it if unsure).
6. Click **Create**. Copy the generated **Client ID**.
7. Paste it into **both**:
   - `fristaid-backend/.env` → `GOOGLE_CLIENT_ID="<the client id>"`
   - `fristaid-mobile/.env.local` → `EXPO_PUBLIC_GOOGLE_CLIENT_ID=<the client id>`
8. Restart both dev servers (`npm run dev` in `fristaid-backend`, `npx expo start` in `fristaid-mobile`) so they pick up the new environment variables.
9. The "Continuer avec Google" buttons should now be enabled — test the full flow: tap it, sign in with a Google account in the popup, confirm it lands on the branded loading screen and then the home tab.
