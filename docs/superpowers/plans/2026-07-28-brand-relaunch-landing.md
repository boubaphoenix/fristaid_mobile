# Refonte de marque — landing, logo, écran de chargement post-connexion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce the new forest-green/terracotta/cream brand identity into `fristaid-mobile`: a reusable vector logo, a branded landing/welcome entry screen, a branded post-login loading transition, and a light retouch of the existing onboarding — without touching safety-semantic colors or native app icons.

**Architecture:** Additive theme tokens (`brand`) alongside the existing `colors`; one new SVG-based `Logo` component family (`LogoMark`/`Wordmark`/`LogoLockup`); two new screens (`(auth)/welcome.tsx`, top-level `post-auth-loading.tsx`); small additive props on two existing shared components (`Screen`, `ProgressSegments`, `PrimaryButton`) so nothing else in the app changes behavior.

**Tech Stack:** Expo Router (file-based routing, `typedRoutes: true`), React Native 0.86, `react-native-svg` (new dependency), existing `@/constants/theme` token system.

## Global Constraints

- Mobile-only: everything lives in `fristaid-mobile` (Expo app). No separate web project.
- New brand tokens live under a new `brand` export in `src/constants/theme.ts`. The existing `colors` export (including safety-semantic colors `emergencyRed`, `successGreen`, `warningOrange`, `trustBlue`, etc.) must not change value or be removed — other screens depend on it as-is.
- The logo is drawn in vector (`react-native-svg`), approximating the source screenshots — no PNG/SVG asset files are available. Do not attempt to reference image files that don't exist.
- Native app icon, native splash image, web favicon, and Android adaptive icon (`app.json` + files in `assets/images/`) are **out of scope** for this plan. Do not modify `app.json`.
- `fristaid-mobile` has no automated test framework (no jest/vitest in `package.json`). Verification for every task is `npx tsc --noEmit` (run from the `fristaid-mobile` directory) plus a manual check via `npx expo start --web`. Do not invent a test runner that isn't configured.
- Path alias `@/` resolves to `./src/*` (see `tsconfig.json`).
- `app.json` has `experiments.typedRoutes: true`. After creating a new route file (e.g. `src/app/(auth)/welcome.tsx`, `src/app/post-auth-loading.tsx`), Expo's dev server must run at least once to regenerate `.expo/types/router.d.ts` before `router.push`/`router.replace`/`Redirect href` calls to that route typecheck cleanly. If `npx tsc --noEmit` complains about an href literal right after adding a route file, run `npx expo start --web` once (Ctrl+C to stop once it's up), then re-run the typecheck.
- Every existing screen using `Screen`, `ProgressSegments`, or `PrimaryButton` without the new optional props must keep working unchanged (all new props are optional with defaults matching current behavior).

---

### Task 1: Brand tokens in `theme.ts`

**Files:**
- Modify: `src/constants/theme.ts`

**Interfaces:**
- Produces: `brand` export from `@/constants/theme` with shape
  `{ forest: string; forestDeep: string; terracotta: string; cream: string; creamCard: string; sage: string; mutedOnDark: string; mutedOnLight: string }`, and `theme.brand` (same object) on the default export.

- [ ] **Step 1: Add the `brand` token object**

In `src/constants/theme.ts`, immediately after the closing `} as const;` of the existing `colors` export (before `export const fonts = ...`), add:

```ts
// Nouvelle identité de marque (planche Banani, 2026-07). Séparée de
// `colors` : `colors` reste le code couleur sémantique de sécurité
// (urgence/succès/avertissement), `brand` est l'habillage visuel
// (fond, primaire, accent) réutilisé sur landing/onboarding/écran de
// chargement.
export const brand = {
  forest: '#16342A',
  forestDeep: '#122A22',
  terracotta: '#C8552C',
  cream: '#F1ECE0',
  creamCard: '#FFFFFF',
  sage: '#8CA290',
  mutedOnDark: 'rgba(255,255,255,0.55)',
  mutedOnLight: '#7C8571',
} as const;
```

- [ ] **Step 2: Include `brand` in the default `theme` export**

Find the `export const theme = { colors, fonts, ... }` block near the bottom of the file. Add `brand,` right after `colors,`:

```ts
export const theme = {
  colors,
  brand,
  fonts,
  typography,
  spacing,
  radius,
  sizes,
  modeNormal,
  modeStress,
  shadows,
} as const;
```

- [ ] **Step 3: Typecheck**

Run: `cd fristaid-mobile && npx tsc --noEmit`
Expected: no errors (this is a pure addition, nothing consumes `brand` yet).

- [ ] **Step 4: Commit**

```bash
cd fristaid-mobile
git add src/constants/theme.ts
git commit -m "Add brand tokens (forest/terracotta/cream) alongside safety colors"
```

---

### Task 2: `Logo` component (`LogoMark`, `Wordmark`, `LogoLockup`)

**Files:**
- Modify: `package.json`, `package-lock.json` (via `npx expo install react-native-svg`)
- Create: `src/components/ui/Logo.tsx`
- Modify: `src/components/ui/index.ts`

**Interfaces:**
- Consumes: `brand`, `colors`, `fonts`, `spacing`, `typography` from `@/constants/theme` (Task 1).
- Produces:
  - `LogoMark({ size?: number; variant?: 'onCream' | 'onForest' })` — badge mark only.
  - `Wordmark({ size?: number; variant?: 'onCream' | 'onForest' })` — "AFRICA"+"SECOURS" text lockup.
  - `LogoLockup({ markSize?: number; wordmarkSize?: number; variant?: 'onCream' | 'onForest'; tagline?: boolean })` — mark + wordmark + optional tagline, stacked.
  - All three exported from `@/components/ui`.

- [ ] **Step 1: Install `react-native-svg`**

Run: `cd fristaid-mobile && npx expo install react-native-svg`
Expected: `react-native-svg` added to `dependencies` in `package.json` at an Expo-SDK-57-compatible version.

- [ ] **Step 2: Create `src/components/ui/Logo.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { brand, colors, fonts, spacing, typography } from '@/constants/theme';

export type LogoVariant = 'onCream' | 'onForest';

const BADGE_COLOR: Record<LogoVariant, string> = {
  onCream: brand.forest,
  onForest: brand.sage,
};

const INNER_CIRCLE_COLOR: Record<LogoVariant, string> = {
  onCream: brand.creamCard,
  onForest: brand.forest,
};

const AFRICA_TEXT_COLOR: Record<LogoVariant, string> = {
  onCream: brand.forest,
  onForest: colors.white,
};

type LogoMarkProps = {
  size?: number;
  variant?: LogoVariant;
};

// Approximation vectorielle du badge (planche de marque Banani) : croix
// arrondie + pointe basse évoquant un pin/bouclier de secours, inscrite
// dans un cercle intérieur, le tout dans un badge rond. Recréé en SVG car
// aucun fichier source (PNG/SVG exporté) n'est disponible — remplacer ce
// composant si les vrais assets sont fournis un jour.
export function LogoMark({ size = 96, variant = 'onCream' }: LogoMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={50} fill={BADGE_COLOR[variant]} />
      <Circle cx={50} cy={50} r={38} fill={INNER_CIRCLE_COLOR[variant]} />
      <Rect x={44} y={30} width={12} height={32} rx={6} fill={brand.terracotta} />
      <Rect x={32} y={38} width={36} height={12} rx={6} fill={brand.terracotta} />
      <Path d="M42,58 L58,58 L50,73 Z" fill={brand.terracotta} />
    </Svg>
  );
}

type WordmarkProps = {
  size?: number;
  variant?: LogoVariant;
};

export function Wordmark({ size = 28, variant = 'onCream' }: WordmarkProps) {
  return (
    <Text style={{ fontFamily: fonts.displayBlack, fontSize: size, letterSpacing: -0.5 }}>
      <Text style={{ color: AFRICA_TEXT_COLOR[variant] }}>AFRICA</Text>
      <Text style={{ color: brand.terracotta }}>SECOURS</Text>
    </Text>
  );
}

type LogoLockupProps = {
  markSize?: number;
  wordmarkSize?: number;
  variant?: LogoVariant;
  tagline?: boolean;
};

export function LogoLockup({
  markSize = 96,
  wordmarkSize = 28,
  variant = 'onCream',
  tagline = true,
}: LogoLockupProps) {
  return (
    <View style={styles.lockup}>
      <LogoMark size={markSize} variant={variant} />
      <Wordmark size={wordmarkSize} variant={variant} />
      {tagline ? (
        <Text
          style={[
            typography.caption,
            styles.tagline,
            { color: variant === 'onForest' ? brand.mutedOnDark : brand.mutedOnLight },
          ]}>
          URGENCE · SECOURS · VIE
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  tagline: {
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
```

- [ ] **Step 3: Export from the UI barrel**

In `src/components/ui/index.ts`, add:

```ts
export { LogoMark, Wordmark, LogoLockup, type LogoVariant } from './Logo';
```

- [ ] **Step 4: Typecheck**

Run: `cd fristaid-mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd fristaid-mobile
git add package.json package-lock.json src/components/ui/Logo.tsx src/components/ui/index.ts
git commit -m "Add vector Logo component (LogoMark/Wordmark/LogoLockup)"
```

---

### Task 3: Welcome/landing screen and routing

**Files:**
- Modify: `src/components/ui/PrimaryButton.tsx`
- Create: `src/app/(auth)/welcome.tsx`
- Modify: `src/app/index.tsx`

**Interfaces:**
- Consumes: `brand` (Task 1), `LogoLockup` + `PrimaryButton` new `'brand'` variant (this task) from `@/components/ui`, `markOnboardingSeen` from `@/lib/onboardingStorage` (existing).
- Produces: route `/(auth)/welcome`; `PrimaryButton`'s `variant` prop gains `'brand'` (existing call sites unaffected since they don't pass it).

- [ ] **Step 1: Add a `brand` variant to `PrimaryButton`**

In `src/components/ui/PrimaryButton.tsx`, update the import and variant type/map:

```ts
import { brand, colors, radius, sizes, typography } from '@/constants/theme';

type PrimaryButtonVariant = 'primary' | 'success' | 'danger' | 'brand';
```

```ts
const VARIANT_COLOR: Record<PrimaryButtonVariant, string> = {
  primary: colors.trustBlue,
  success: colors.successGreen,
  danger: colors.emergencyRed,
  brand: brand.terracotta,
};
```

- [ ] **Step 2: Create `src/app/(auth)/welcome.tsx`**

```tsx
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoLockup, PrimaryButton } from '@/components/ui';
import { brand, colors, spacing, typography } from '@/constants/theme';
import { markOnboardingSeen } from '@/lib/onboardingStorage';

// Écran 00 — nouveau point d'entrée (planche de marque). index.tsx route
// ici pour tout utilisateur non connecté n'ayant pas encore vu
// l'onboarding, à la place d'un accès direct au carousel.
export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <LogoLockup markSize={112} wordmarkSize={30} variant="onForest" />
          <Text style={[typography.body, styles.pitch]}>
            La formation aux gestes qui sauvent, et une IA pour vous guider en
            situation d'urgence.
          </Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label="Commencer"
            variant="brand"
            onPress={() => router.push('/(auth)/onboarding')}
            style={styles.primaryButton}
          />
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              await markOnboardingSeen();
              router.replace('/(auth)/login');
            }}
            hitSlop={8}>
            <Text style={[typography.bodyBold, styles.loginLink]}>J'ai déjà un compte</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: brand.forest,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  pitch: {
    color: colors.white,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  actions: {
    marginBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  primaryButton: {
    width: '100%',
  },
  loginLink: {
    color: colors.white,
  },
});
```

- [ ] **Step 3: Route to `welcome` instead of `onboarding` from `index.tsx`**

In `src/app/index.tsx`, change the final line:

```ts
return <Redirect href={onboardingSeen ? '/(auth)/login' : '/(auth)/welcome'} />;
```

(only this one line changes in this task; the background color of the loading `View` above it is addressed in Task 6)

- [ ] **Step 4: Regenerate route types, then typecheck**

Run: `cd fristaid-mobile && npx expo start --web` (wait for "Web is waiting on..." / bundler ready, then stop it with Ctrl+C)
Run: `npx tsc --noEmit`
Expected: no errors. If `href`/`router.push('/(auth)/onboarding')` or the new route complain, confirm `.expo/types/router.d.ts` was regenerated by the previous step and re-run.

- [ ] **Step 5: Manual check**

Run: `npx expo start --web`, open the app in a fresh/incognito browser tab (so no `africasecour_onboarding_seen` value is in `localStorage`).
Expected: lands on the new dark-green welcome screen with the logo lockup and pitch text. Tapping "Commencer" navigates to the existing onboarding carousel. Going back and tapping "J'ai déjà un compte" navigates to `/login`.

- [ ] **Step 6: Commit**

```bash
cd fristaid-mobile
git add src/components/ui/PrimaryButton.tsx src/app/(auth)/welcome.tsx src/app/index.tsx
git commit -m "Add branded welcome/landing screen as new entry point"
```

---

### Task 4: Post-login branded loading screen

**Files:**
- Create: `src/app/post-auth-loading.tsx`
- Modify: `src/app/(auth)/login.tsx`
- Modify: `src/app/(auth)/register.tsx`

**Interfaces:**
- Consumes: `LogoLockup` (Task 2), `brand`/`typography` (Task 1), `router` from `expo-router` (already imported in both modified files).
- Produces: route `/post-auth-loading`, which redirects to `/(tabs)` after a minimum display time.

- [ ] **Step 1: Create `src/app/post-auth-loading.tsx`**

```tsx
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { LogoLockup } from '@/components/ui';
import { brand, typography } from '@/constants/theme';

const MIN_DISPLAY_MS = 900;

// Affiché uniquement juste après une connexion/inscription explicite
// (déclenché par login.tsx / register.tsx), jamais au redémarrage à froid
// avec un token déjà stocké — ce cas reste géré par le splash natif.
// Route volontairement hors des groupes (auth)/(tabs) : (auth)/_layout.tsx
// redirige tout accès à (auth)/* vers /(tabs) dès qu'un token existe, ce
// qui court-circuiterait cet écran s'il vivait dans ce groupe.
export default function PostAuthLoadingScreen() {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();

    const timeout = setTimeout(() => {
      router.replace('/(tabs)');
    }, MIN_DISPLAY_MS);

    return () => {
      loop.stop();
      clearTimeout(timeout);
    };
  }, [pulse]);

  return (
    <View style={styles.container}>
      <LogoLockup markSize={96} wordmarkSize={26} variant="onForest" tagline={false} />
      <Animated.Text style={[typography.small, styles.loadingLabel, { opacity: pulse }]}>
        CHARGEMENT…
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.forest,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingLabel: {
    color: brand.mutedOnDark,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
```

- [ ] **Step 2: Navigate to it after login**

In `src/app/(auth)/login.tsx`, inside `handleSubmit`, change:

```ts
const { token } = await login(email, password);
await signIn(token);
```

to:

```ts
const { token } = await login(email, password);
await signIn(token);
router.replace('/post-auth-loading');
```

- [ ] **Step 3: Navigate to it after registration**

In `src/app/(auth)/register.tsx`, inside `handleSubmit`, change:

```ts
const { token } = await registerAccount(email, password, fullName || undefined, normalizePhone(phone));
await signIn(token);
```

to:

```ts
const { token } = await registerAccount(email, password, fullName || undefined, normalizePhone(phone));
await signIn(token);
router.replace('/post-auth-loading');
```

- [ ] **Step 4: Regenerate route types, then typecheck**

Run: `cd fristaid-mobile && npx expo start --web` (wait for ready, Ctrl+C)
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual check**

Run: `npx expo start --web`. Log in with a valid test account (or register a new one against the local backend — see `fristaid-backend`, must be running).
Expected: immediately after submitting, the dark-green "CHARGEMENT…" screen appears with the logo pulsing, then after ~900ms it lands on the real home tab (`/(tabs)`). Force-quit and reopen the app afterward (token still stored): confirm it goes straight to `/(tabs)` without showing the loading screen again (cold boot still uses the existing native splash / blank guard, not this screen).

- [ ] **Step 6: Commit**

```bash
cd fristaid-mobile
git add src/app/post-auth-loading.tsx src/app/(auth)/login.tsx src/app/(auth)/register.tsx
git commit -m "Add branded post-login loading transition before the home tab"
```

---

### Task 5: Onboarding retouch (brand colors, no logic change)

**Files:**
- Modify: `src/components/ui/Screen.tsx`
- Modify: `src/components/ui/ProgressSegments.tsx`
- Modify: `src/app/(auth)/onboarding.tsx`

**Interfaces:**
- Produces: `Screen` gains an optional `backgroundColor?: string` prop (overrides the `mode`-derived background when set). `ProgressSegments` gains an optional `activeColor?: string` prop (defaults to `colors.trustBlue`, preserving current behavior everywhere it's already used).

- [ ] **Step 1: Add `backgroundColor` override to `Screen`**

In `src/components/ui/Screen.tsx`, update the props type and the background calculation:

```ts
type ScreenProps = PropsWithChildren<{
  mode?: ScreenMode;
  scroll?: boolean;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}>;

export function Screen({ mode = 'normal', scroll = false, backgroundColor, style, children }: ScreenProps) {
  const background = backgroundColor ?? (mode === 'stress' ? modeStress.background : modeNormal.background);
  const Container = scroll ? ScrollView : View;
  const containerProps = scroll
    ? { contentContainerStyle: [styles.content, style] }
    : { style: [styles.content, style] };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]} edges={['top', 'bottom']}>
      <Container {...(containerProps as object)}>{children}</Container>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Add `activeColor` override to `ProgressSegments`**

In `src/components/ui/ProgressSegments.tsx`:

```ts
type ProgressSegmentsProps = {
  count: number;
  total: number;
  height?: number;
  activeColor?: string;
};

export function ProgressSegments({ count, total, height = 8, activeColor = colors.trustBlue }: ProgressSegmentsProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            {
              height,
              backgroundColor: index < count ? activeColor : colors.border,
            },
          ]}
        />
      ))}
    </View>
  );
}
```

- [ ] **Step 3: Apply the brand look in `onboarding.tsx`**

In `src/app/(auth)/onboarding.tsx`:

Update the import line to include `brand`:

```ts
import { brand, colors, spacing, typography } from '@/constants/theme';
```

Change the `Screen` usage:

```tsx
<Screen mode="normal" backgroundColor={brand.cream}>
```

Change the `ProgressSegments` usage:

```tsx
<ProgressSegments count={slideIndex + 1} total={SLIDES.length} activeColor={brand.terracotta} />
```

Change the `skip` style:

```ts
skip: {
  color: brand.terracotta,
},
```

No other lines in this file change (slide content, `markOnboardingSeen`, navigation calls stay exactly as they are).

- [ ] **Step 4: Typecheck**

Run: `cd fristaid-mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual check**

Run: `npx expo start --web`, reach the onboarding carousel via the welcome screen's "Commencer" button.
Expected: cream background, terracotta "Passer" link and progress segments; slide content and skip/next behavior unchanged. Spot-check one other `Screen`/`ProgressSegments` consumer (e.g. `/(tabs)` home, `/(auth)/login`) still renders with its original colors (no `backgroundColor`/`activeColor` passed there, so nothing changed).

- [ ] **Step 6: Commit**

```bash
cd fristaid-mobile
git add src/components/ui/Screen.tsx src/components/ui/ProgressSegments.tsx src/app/(auth)/onboarding.tsx
git commit -m "Restyle onboarding carousel with brand cream/terracotta accents"
```

---

### Task 6: Coherence pass — guard backgrounds and auth screen headers

**Files:**
- Modify: `src/app/index.tsx`
- Modify: `src/app/(auth)/_layout.tsx`
- Modify: `src/app/(auth)/login.tsx`
- Modify: `src/app/(auth)/register.tsx`

**Interfaces:**
- Consumes: `brand` (Task 1), `LogoMark` (Task 2).

- [ ] **Step 1: Swap the guard background in `index.tsx`**

In `src/app/index.tsx`, replace the import and the loading view's background:

```ts
import { brand } from '@/constants/theme';
```

```tsx
if (isLoading || (!token && onboardingSeen === null)) {
  return <View style={{ flex: 1, backgroundColor: brand.cream }} />;
}
```

- [ ] **Step 2: Swap the guard background in `(auth)/_layout.tsx`**

In `src/app/(auth)/_layout.tsx`, replace the import and the loading view's background:

```ts
import { brand } from '@/constants/theme';
```

```tsx
if (isLoading) {
  return <View style={{ flex: 1, backgroundColor: brand.cream }} />;
}
```

- [ ] **Step 3: Add a header `LogoMark` to `login.tsx`**

In `src/app/(auth)/login.tsx`, update the import:

```ts
import { LogoMark, OutlineButton, PrimaryButton, Screen, TextField } from '@/components/ui';
```

Add `View` to the `react-native` import:

```ts
import { Pressable, StyleSheet, Text, View } from 'react-native';
```

Insert a header row as the first child of `<Screen mode="normal">`, right before the "Connexion" `Text`:

```tsx
<Screen mode="normal">
  <View style={styles.logoHeader}>
    <LogoMark size={48} variant="onCream" />
  </View>
  <Text style={[typography.h2, styles.spaced]}>Connexion</Text>
```

Add the style:

```ts
logoHeader: {
  alignItems: 'center',
  marginTop: spacing.md,
  marginBottom: spacing.sm,
},
```

- [ ] **Step 4: Add a header `LogoMark` to `register.tsx`**

In `src/app/(auth)/register.tsx`, update the import:

```ts
import { LogoMark, PointsBadge, PrimaryButton, Screen, TextField } from '@/components/ui';
```

Insert a header row as the first child of `<Screen mode="normal" scroll>`, right before the existing `styles.headerRow` view:

```tsx
<Screen mode="normal" scroll>
  <View style={styles.logoHeader}>
    <LogoMark size={48} variant="onCream" />
  </View>
  <View style={styles.headerRow}>
```

Add the same style used in `login.tsx`:

```ts
logoHeader: {
  alignItems: 'center',
  marginTop: spacing.md,
  marginBottom: spacing.sm,
},
```

- [ ] **Step 5: Typecheck**

Run: `cd fristaid-mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual check**

Run: `npx expo start --web`.
Expected: cold boot (token cleared) briefly shows a cream — not gray — screen before landing on welcome/login. `/login` and `/register` each show a small dark-green badge above their titles. Full path end to end once more: welcome → commencer → onboarding → register (or login) → post-auth-loading → home tab.

- [ ] **Step 7: Commit**

```bash
cd fristaid-mobile
git add src/app/index.tsx "src/app/(auth)/_layout.tsx" "src/app/(auth)/login.tsx" "src/app/(auth)/register.tsx"
git commit -m "Use brand cream for guard screens; add logo header to login/register"
```

---

## Out of scope (documented, not built here)

Native app icon, native splash image, web favicon, and Android adaptive icon assets (`app.json` + `assets/images/*`) need real exported PNG/SVG files before they can be swapped — no task in this plan touches them.
