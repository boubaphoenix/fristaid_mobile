# Classement AFRICASECOUR (Hebdomadaire/Mensuel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a weekly/monthly Top 100 leaderboard, pedagogical titles, and a simple manually-granted rewards system to AFRICASECOUR, without touching any existing points/course/quiz/simulation/mission/badge behavior.

**Architecture:** Two-repo change (`fristaid-backend`, `fristaid-mobile`). Backend: one new table (`user_rewards`) for manually-granted rewards; the leaderboard, ranks, and titles are computed on read from the existing `points_transactions` table (no pre-aggregated table, no sync risk) — the same "derive in reads, never persist" philosophy already used for `pathway_status` in this codebase. A new `revision_utile` points source rewards users who re-pass an already-passed quiz or simulation, capped once/day/course. Mobile: one new screen (`leaderboard.tsx`, reached by navigation, not a new tab) plus small additive sections on the existing home and profile screens.

**Tech Stack:** Express + Prisma + PostgreSQL (Neon) on the backend; Expo Router + React Native on mobile. Raw SQL via `prisma.$queryRaw(Prisma.sql\`...\`)` for the period-aggregated leaderboard queries (Prisma's query builder has no window/aggregate-with-rank support needed here).

## Global Constraints

- Never expose `email` in any `/leaderboard/*` response — display name falls back to an anonymized `Secouriste #XXXX` when `full_name` is unset.
- `awardPoints()`'s existing signature and behavior must not change for any of its 7 current call sites — the new 5th parameter is optional and defaults to today's exact behavior (`reference_type`/`reference_id` stay `null`).
- Revision points (+5) are capped at **1 per user per course per calendar day (UTC)**, regardless of whether the revision came from the quiz or the simulation.
- No admin routes/screens in this phase — `user_rewards` rows are granted via direct SQL on the dev database, exactly like the Étouffement course content earlier in this project.
- No streak/daily-activity tracking in this phase (deferred).
- Titles are derived from `profiles.points_total` (all-time, already stored) — never a new stored column.
- IA SOS point logic (`src/routes/sos.ts`) is not touched — it already only awards points on a user's very first session ever.
- No new tab in mobile navigation — the leaderboard screen is reached via a card on the home screen and a link on the profile screen, exactly like `passport.tsx` today.
- `npx tsc --noEmit` must stay clean in both repos after every task (no test framework in either repo — this is the verification gate used throughout this project).

---

### Task 1: `user_rewards` table + `awardPoints()` reference support

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/services/points.ts`
- Migrate: `prisma/migrations/<timestamp>_add_user_rewards/migration.sql` (generated)

**Interfaces:**
- Produces: `awardPoints(tx, userId, amount, reason, reference?)` where `reference` is `{ type: string; id: string } | undefined` — Tasks 4 and later rely on this exact signature.
- Produces: `user_rewards` Prisma model, fields: `id, user_id, reward_type, title, description, period_type, period_start, period_end, status, awarded_at, claimed_at`.

- [ ] **Step 1: Add the `user_rewards` model to the schema**

In `prisma/schema.prisma`, after the `certificates` model, add:

```prisma
model user_rewards {
  id           String    @id @default(uuid()) @db.Uuid
  user_id      String    @db.Uuid
  reward_type  String
  title        String
  description  String
  period_type  String?
  period_start DateTime? @db.Date
  period_end   DateTime? @db.Date
  status       String    @default("pending")
  awarded_at   DateTime  @default(now())
  claimed_at   DateTime?

  user users @relation(fields: [user_id], references: [id])

  @@index([user_id])
}
```

Then find the `users` model's relations block (it has lines like `simulation_attempts simulation_attempts[]` and `user_badges user_badges[]`) and add one more line there:

```prisma
  user_rewards user_rewards[]
```

- [ ] **Step 2: Verify migration status, then create and apply the migration**

Run: `npx prisma migrate status`
Expected: "Database schema is up to date!" (confirms no drift before adding a new migration — project convention after a prior schema-drift incident).

Run: `npx prisma migrate dev --name add_user_rewards`
Expected: a new file under `prisma/migrations/<timestamp>_add_user_rewards/migration.sql` containing a `CREATE TABLE "user_rewards" (...)` statement, applied successfully, ending with "Your database is now in sync with your schema."

- [ ] **Step 3: Regenerate the Prisma client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" with no errors.

- [ ] **Step 4: Extend `awardPoints()` with an optional reference parameter**

Replace the full contents of `src/services/points.ts`:

```ts
import type { Prisma } from '../generated/prisma';

// Centralise l'attribution de points (points_transactions + mise à jour
// du total sur profiles) pour que chaque action à points (leçon, cours,
// quiz, mission, session SOS...) suive exactement la même écriture.
// `reference` est optionnel et purement additif : les 7 appelants
// existants qui ne le passent pas gardent exactement le même
// comportement (reference_type/reference_id restent null).
export async function awardPoints(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  reason: string,
  reference?: { type: string; id: string },
) {
  await tx.points_transactions.create({
    data: {
      user_id: userId,
      amount,
      reason,
      reference_type: reference?.type ?? null,
      reference_id: reference?.id ?? null,
    },
  });
  await tx.profiles.update({ where: { user_id: userId }, data: { points_total: { increment: amount } } });
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (this change is additive; all 7 existing call sites pass only 4 args, which remains valid).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/services/points.ts
git commit -m "feat: add user_rewards table and optional points reference"
```

---

### Task 2: Pedagogical titles service

**Files:**
- Create: `src/services/titles.ts`

**Interfaces:**
- Produces: `TITLES: TitleTier[]`, `computeTitle(pointsTotal: number): { title: string; level: number; nextTitle: string | null; pointsToNext: number | null }`, `computeRankTitle(rank: number, periodType: 'week' | 'month'): string | null`. Task 3 and Task 5 both consume `computeTitle`/`computeRankTitle`/`TITLES`.

- [ ] **Step 1: Create the titles service**

Create `src/services/titles.ts`:

```ts
export type TitleTier = {
  title: string;
  level: number;
  min_points: number;
  max_points: number | null;
};

// Grille de titres pédagogiques cumulatifs (dérivés de profiles.points_total,
// jamais stockés) — huit paliers, du premier pas à la maîtrise complète.
export const TITLES: TitleTier[] = [
  { title: 'Apprenant Secours', level: 1, min_points: 0, max_points: 99 },
  { title: 'Citoyen Préparé', level: 2, min_points: 100, max_points: 249 },
  { title: 'Réflexe Secours', level: 3, min_points: 250, max_points: 499 },
  { title: 'Gardien de Vie', level: 4, min_points: 500, max_points: 999 },
  { title: 'Sentinelle AFRICASECOUR', level: 5, min_points: 1000, max_points: 1999 },
  { title: 'Leader Prévention', level: 6, min_points: 2000, max_points: 3499 },
  { title: 'Ambassadeur Secours', level: 7, min_points: 3500, max_points: 4999 },
  { title: 'Maître des Bons Gestes', level: 8, min_points: 5000, max_points: null },
];

export function computeTitle(pointsTotal: number): {
  title: string;
  level: number;
  nextTitle: string | null;
  pointsToNext: number | null;
} {
  const current = TITLES.slice()
    .reverse()
    .find((tier) => pointsTotal >= tier.min_points) ?? TITLES[0]!;
  const next = TITLES.find((tier) => tier.level === current.level + 1) ?? null;

  return {
    title: current.title,
    level: current.level,
    nextTitle: next?.title ?? null,
    pointsToNext: next ? next.min_points - pointsTotal : null,
  };
}

type RankTier = { max_rank: number; title: string };

const WEEK_RANK_TITLES: RankTier[] = [
  { max_rank: 1, title: 'Champion Secours de la semaine' },
  { max_rank: 5, title: 'Leaders de Vie' },
  { max_rank: 20, title: 'Gardiens AFRICASECOUR' },
  { max_rank: 50, title: 'Protecteurs Actifs' },
  { max_rank: 100, title: 'Citoyens Engagés' },
];

const MONTH_RANK_TITLES: RankTier[] = [
  { max_rank: 1, title: 'Champion AFRICASECOUR du mois' },
  { max_rank: 5, title: 'Ambassadeurs Prévention' },
  { max_rank: 20, title: 'Leaders Communautaires Secours' },
  { max_rank: 100, title: 'Protecteurs du Mois' },
];

// Titre de rang optionnel, distinct du titre pédagogique cumulatif —
// null si l'utilisateur est hors Top 100 (pas de titre de rang pour lui).
export function computeRankTitle(rank: number, periodType: 'week' | 'month'): string | null {
  const grid = periodType === 'week' ? WEEK_RANK_TITLES : MONTH_RANK_TITLES;
  return grid.find((tier) => rank <= tier.max_rank)?.title ?? null;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/titles.ts
git commit -m "feat: add pedagogical titles service"
```

---

### Task 3: Leaderboard computation service

**Files:**
- Create: `src/services/leaderboard.ts`

**Interfaces:**
- Consumes: `computeTitle`, `computeRankTitle` from `src/services/titles.ts` (Task 2); `prisma` from `src/lib/prisma`.
- Produces: `type PeriodType = 'week' | 'month'`; `getPeriodBounds(periodType, now?): { start: Date; end: Date }`; `type LeaderboardEntry = { rank: number; user_id: string; display_name: string; avatar_url: string | null; points: number; title: string; rank_title: string | null }`; `getLeaderboard(periodType, limit?): Promise<LeaderboardEntry[]>`; `getUserPeriodPoints(userId, periodType): Promise<number>`; `getUserPeriodRank(userId, periodType, userPoints): Promise<number>`. Task 5 (routes) consumes all of these.

- [ ] **Step 1: Create the leaderboard service**

Create `src/services/leaderboard.ts`:

```ts
import { Prisma } from '../generated/prisma';
import { prisma } from '../lib/prisma';
import { computeRankTitle, computeTitle } from './titles';

export type PeriodType = 'week' | 'month';

// Semaine ISO (lundi 00:00:00 UTC → lundi suivant, exclusif) ou mois
// calendaire UTC. Toujours calculé, jamais stocké : même philosophie que
// pathway_status côté cours — pas de table de cache à garder synchronisée.
export function getPeriodBounds(periodType: PeriodType, now: Date = new Date()): { start: Date; end: Date } {
  if (periodType === 'week') {
    const day = now.getUTCDay();
    const diffToMonday = (day + 6) % 7;
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    return { start, end };
  }

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

function displayName(fullName: string | null, userId: string): string {
  if (fullName && fullName.trim().length > 0) return fullName;
  return `Secouriste #${userId.slice(0, 4).toUpperCase()}`;
}

export type LeaderboardEntry = {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  title: string;
  rank_title: string | null;
};

// Top N calculé à la demande à partir de points_transactions — jamais
// l'email (confidentialité : nom affiché = full_name ou identifiant
// anonymisé). Le titre affiché par entrée est le titre pédagogique
// cumulatif (profiles.points_total), pas les points de la période.
export async function getLeaderboard(periodType: PeriodType, limit = 100): Promise<LeaderboardEntry[]> {
  const { start, end } = getPeriodBounds(periodType);

  const rows = await prisma.$queryRaw<
    { user_id: string; full_name: string | null; avatar_url: string | null; points_total: number; period_points: number }[]
  >(Prisma.sql`
    SELECT pt.user_id, p.full_name, p.avatar_url, p.points_total, SUM(pt.amount)::int AS period_points
    FROM points_transactions pt
    JOIN users u ON u.id = pt.user_id
    JOIN profiles p ON p.user_id = pt.user_id
    WHERE pt.created_at >= ${start} AND pt.created_at < ${end} AND u.is_active = true
    GROUP BY pt.user_id, p.full_name, p.avatar_url, p.points_total
    ORDER BY period_points DESC
    LIMIT ${limit}
  `);

  return rows.map((row, index) => {
    const rank = index + 1;
    return {
      rank,
      user_id: row.user_id,
      display_name: displayName(row.full_name, row.user_id),
      avatar_url: row.avatar_url,
      points: row.period_points,
      title: computeTitle(row.points_total).title,
      rank_title: computeRankTitle(rank, periodType),
    };
  });
}

// Somme des points de l'utilisateur sur la période — 0 s'il n'a rien
// gagné (COALESCE garantit toujours exactement une ligne).
export async function getUserPeriodPoints(userId: string, periodType: PeriodType): Promise<number> {
  const { start, end } = getPeriodBounds(periodType);
  const [row] = await prisma.$queryRaw<{ points_total: number }[]>(Prisma.sql`
    SELECT COALESCE(SUM(amount), 0)::int AS points_total
    FROM points_transactions
    WHERE user_id = ${userId}::uuid AND created_at >= ${start} AND created_at < ${end}
  `);
  return row?.points_total ?? 0;
}

// Rang = 1 + nombre d'utilisateurs actifs strictement devant sur la
// période. Évite les fonctions fenêtrées SQL, largement suffisant pour un
// Top 100 ; userPoints doit venir de getUserPeriodPoints (même période)
// pour éviter une deuxième somme redondante.
export async function getUserPeriodRank(userId: string, periodType: PeriodType, userPoints: number): Promise<number> {
  const { start, end } = getPeriodBounds(periodType);
  const [row] = await prisma.$queryRaw<{ rank: number }[]>(Prisma.sql`
    SELECT 1 + COUNT(*)::int AS rank
    FROM (
      SELECT pt.user_id
      FROM points_transactions pt
      JOIN users u ON u.id = pt.user_id
      WHERE pt.created_at >= ${start} AND pt.created_at < ${end} AND u.is_active = true
      GROUP BY pt.user_id
      HAVING SUM(pt.amount) > ${userPoints}
    ) higher
  `);
  return row?.rank ?? 1;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/leaderboard.ts
git commit -m "feat: add leaderboard computation service"
```

---

### Task 4: Revision points + wiring into quiz and simulation

**Files:**
- Create: `src/services/revision.ts`
- Modify: `src/routes/quiz.ts`
- Modify: `src/routes/simulation.ts`

**Interfaces:**
- Consumes: `awardPoints(tx, userId, amount, reason, reference?)` from Task 1.
- Produces: `REVISION_POINTS = 5`, `tryAwardRevisionPoints(tx, userId, courseId): Promise<boolean>` — returns `true` only if points were actually awarded (not already capped today). Task 6+ and mobile do not consume this directly; it's internal to quiz.ts/simulation.ts.

- [ ] **Step 1: Create the revision service**

Create `src/services/revision.ts`:

```ts
import type { Prisma } from '../generated/prisma';
import { awardPoints } from './points';

export const REVISION_POINTS = 5;

// Récompense une révision réelle : rejouer avec succès un quiz ou une
// simulation déjà réussi(e) auparavant. Plafonnée à 1 fois/jour/cours
// (tous types de révision confondus — pas de cumul quiz+simulation le
// même jour), pour rester résistant à l'abus par simple répétition.
// Alimente enfin reference_type/reference_id sur points_transactions,
// présents depuis le début mais jamais utilisés jusqu'ici.
export async function tryAwardRevisionPoints(
  tx: Prisma.TransactionClient,
  userId: string,
  courseId: string,
): Promise<boolean> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const existing = await tx.points_transactions.findFirst({
    where: {
      user_id: userId,
      reason: 'revision_utile',
      reference_type: 'course',
      reference_id: courseId,
      created_at: { gte: startOfDay },
    },
  });
  if (existing) return false;

  await awardPoints(tx, userId, REVISION_POINTS, 'revision_utile', { type: 'course', id: courseId });
  return true;
}
```

- [ ] **Step 2: Wire into the quiz route**

In `src/routes/quiz.ts`, the transaction currently has this shape (do not change anything else in the file):

```ts
    let certificate = null;
    if (passed) {
      const existingCertificate = await tx.certificates.findFirst({
        where: { user_id: req.userId!, course_id: course.id },
      });

      if (!existingCertificate) {
        certificate = await tx.certificates.create({
          data: {
            user_id: req.userId!,
            course_id: course.id,
            course_title: course.title,
            score: scorePercent,
            certificate_number: generateCertificateNumber(),
          },
        });
        await awardPoints(tx, req.userId!, QUIZ_PASSED_POINTS, 'quiz_reussi');
        await checkAndAwardBadge(tx, req.userId!, course.id);
      } else {
        certificate = existingCertificate;
      }
    }
```

Add the import at the top of the file (alongside the existing imports):

```ts
import { tryAwardRevisionPoints } from '../services/revision';
```

Change the `else` branch to:

```ts
      } else {
        certificate = existingCertificate;
        await tryAwardRevisionPoints(tx, req.userId!, course.id);
      }
```

- [ ] **Step 3: Wire into the simulation route**

In `src/routes/simulation.ts`, the transaction currently has this shape:

```ts
    let pointsAwarded = 0;
    if (passed && !existingPass) {
      pointsAwarded = SIMULATION_PASSED_POINTS;
      await awardPoints(tx, req.userId!, SIMULATION_PASSED_POINTS, 'simulation_reussie');
    }

    const badge = passed ? await checkAndAwardBadge(tx, req.userId!, course.id) : null;
```

Add the import at the top of the file:

```ts
import { REVISION_POINTS, tryAwardRevisionPoints } from '../services/revision';
```

Change to:

```ts
    let pointsAwarded = 0;
    if (passed && !existingPass) {
      pointsAwarded = SIMULATION_PASSED_POINTS;
      await awardPoints(tx, req.userId!, SIMULATION_PASSED_POINTS, 'simulation_reussie');
    } else if (passed && existingPass) {
      const revisionAwarded = await tryAwardRevisionPoints(tx, req.userId!, course.id);
      if (revisionAwarded) pointsAwarded = REVISION_POINTS;
    }

    const badge = passed ? await checkAndAwardBadge(tx, req.userId!, course.id) : null;
```

(`quiz.ts`'s JSON response has no `points_awarded` field today — leave it exactly as-is, the revision call is a pure side effect there. `simulation.ts`'s response already returns `points_awarded: result.pointsAwarded`, so this change makes that field correctly reflect revision points too.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Start the dev server (`npm run dev`) and, using an authenticated test user who has already passed a quiz once:
1. `POST /courses/:id/quiz/submit` again with a passing score → check `points_transactions` for a new `reason='revision_utile'` row of `amount=5`, and `profiles.points_total` incremented by 5.
2. Repeat the same call again the same day → no new `revision_utile` row, `points_total` unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/services/revision.ts src/routes/quiz.ts src/routes/simulation.ts
git commit -m "feat: award capped revision points on repeat quiz/simulation success"
```

---

### Task 5: Leaderboard routes

**Files:**
- Create: `src/routes/leaderboard.ts`
- Modify: `src/app.ts`

**Interfaces:**
- Consumes: `getPeriodBounds`, `getLeaderboard`, `getUserPeriodPoints`, `getUserPeriodRank`, `type PeriodType` from `src/services/leaderboard.ts` (Task 3); `computeTitle`, `TITLES` from `src/services/titles.ts` (Task 2); `requireAuth` from `src/middleware/requireAuth`; `prisma` from `src/lib/prisma`.
- Produces: `GET /leaderboard/week`, `GET /leaderboard/month` returning `{ period: { type, start, end }, entries: LeaderboardEntry[], me: { rank, points, title, points_to_next_title, next_title, points_to_top100, rank_title, message } }`; `GET /leaderboard/titles` returning `{ titles: TitleTier[] }`. Mobile Task 7 consumes this exact response shape.

- [ ] **Step 1: Create the leaderboard routes**

Create `src/routes/leaderboard.ts`:

```ts
import { Router } from 'express';

import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';
import {
  getLeaderboard,
  getPeriodBounds,
  getUserPeriodPoints,
  getUserPeriodRank,
  type PeriodType,
} from '../services/leaderboard';
import { computeRankTitle, computeTitle, TITLES } from '../services/titles';

export const leaderboardRouter = Router();

function periodLabel(periodType: PeriodType): string {
  return periodType === 'week' ? 'cette semaine' : 'ce mois-ci';
}

async function buildLeaderboardResponse(periodType: PeriodType, userId: string) {
  const { start, end } = getPeriodBounds(periodType);
  const entries = await getLeaderboard(periodType, 100);
  const points = await getUserPeriodPoints(userId, periodType);
  const rank = await getUserPeriodRank(userId, periodType, points);
  const profile = await prisma.profiles.findUnique({ where: { user_id: userId } });
  const { title, nextTitle, pointsToNext } = computeTitle(profile?.points_total ?? 0);

  const lastEntry = entries[entries.length - 1];
  const pointsToTop100 = rank > 100 && lastEntry ? Math.max(0, lastEntry.points - points + 1) : 0;

  const message =
    rank <= 100
      ? `Tu es ${rank}${rank === 1 ? 'er' : 'e'} ${periodLabel(periodType)}. Continue avec une révision ou une simulation.`
      : `Tu es ${rank}${rank === 1 ? 'er' : 'e'} ${periodLabel(periodType)}. Encore ${pointsToTop100} points pour entrer dans le Top 100.`;

  return {
    period: { type: periodType, start: start.toISOString(), end: end.toISOString() },
    entries,
    me: {
      rank,
      points,
      title,
      points_to_next_title: pointsToNext,
      next_title: nextTitle,
      points_to_top100: pointsToTop100,
      rank_title: computeRankTitle(rank, periodType),
      message,
    },
  };
}

// GET /leaderboard/week et /leaderboard/month — Top 100 + rang personnel,
// tout calculé à la demande depuis points_transactions (jamais stocké).
// Ne renvoie jamais l'email (voir getLeaderboard/displayName).
leaderboardRouter.get('/leaderboard/week', requireAuth, async (req, res) => {
  if (!req.userId) throw new AppError(401, 'UNAUTHORIZED', 'Authentification requise.');
  res.json(await buildLeaderboardResponse('week', req.userId));
});

leaderboardRouter.get('/leaderboard/month', requireAuth, async (req, res) => {
  if (!req.userId) throw new AppError(401, 'UNAUTHORIZED', 'Authentification requise.');
  res.json(await buildLeaderboardResponse('month', req.userId));
});

leaderboardRouter.get('/leaderboard/titles', requireAuth, async (req, res) => {
  if (!req.userId) throw new AppError(401, 'UNAUTHORIZED', 'Authentification requise.');
  res.json({ titles: TITLES });
});
```

- [ ] **Step 2: Mount the router**

In `src/app.ts`, add the import alongside the other route imports:

```ts
import { leaderboardRouter } from './routes/leaderboard';
```

And mount it alongside the other `app.use(...)` calls, after `app.use(sosRouter);`:

```ts
  app.use(sosRouter);
  app.use(leaderboardRouter);
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Start the dev server and, with a valid auth token:
1. `GET /leaderboard/week` → confirm the response has `period`, `entries` (array, each entry has `rank`, `user_id`, `display_name`, `avatar_url`, `points`, `title`, `rank_title`, and **no `email` field anywhere**), and `me`.
2. `GET /leaderboard/month` → same shape, different period bounds.
3. `GET /leaderboard/titles` → confirm the 8-tier array matches the grid in `titles.ts`.
4. For a user with `full_name` unset, confirm `display_name` in `entries` reads `Secouriste #XXXX`, never the email.

- [ ] **Step 5: Commit**

```bash
git add src/routes/leaderboard.ts src/app.ts
git commit -m "feat: add weekly/monthly leaderboard routes"
```

---

### Task 6: Rewards route

**Files:**
- Create: `src/routes/rewards.ts`
- Modify: `src/app.ts`

**Interfaces:**
- Consumes: `prisma.user_rewards` (Task 1's model); `requireAuth`.
- Produces: `GET /rewards/me` returning `{ rewards: [{ id, reward_type, title, description, period_type, period_start, period_end, status, awarded_at, claimed_at }] }`. Mobile Task 7 consumes this exact shape.

- [ ] **Step 1: Create the rewards route**

Create `src/routes/rewards.ts`:

```ts
import { Router } from 'express';

import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';

export const rewardsRouter = Router();

// GET /rewards/me — les récompenses (badge spécial, réduction kit,
// invitation ambassadeur...) sont accordées manuellement via SQL direct
// dans cette phase MVP (pas d'admin, cf. docs/superpowers/plans/
// 2026-07-31-weekly-monthly-leaderboard.md) ; cette route ne fait que
// les lister pour l'utilisateur authentifié.
rewardsRouter.get('/rewards/me', requireAuth, async (req, res) => {
  if (!req.userId) throw new AppError(401, 'UNAUTHORIZED', 'Authentification requise.');

  const rewards = await prisma.user_rewards.findMany({
    where: { user_id: req.userId },
    orderBy: { awarded_at: 'desc' },
  });

  res.json({
    rewards: rewards.map((reward) => ({
      id: reward.id,
      reward_type: reward.reward_type,
      title: reward.title,
      description: reward.description,
      period_type: reward.period_type,
      period_start: reward.period_start,
      period_end: reward.period_end,
      status: reward.status,
      awarded_at: reward.awarded_at,
      claimed_at: reward.claimed_at,
    })),
  });
});
```

- [ ] **Step 2: Mount the router**

In `src/app.ts`, add the import:

```ts
import { rewardsRouter } from './routes/rewards';
```

And mount after `app.use(leaderboardRouter);`:

```ts
  app.use(leaderboardRouter);
  app.use(rewardsRouter);
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

1. `GET /rewards/me` with a valid token and no rewards yet → `{ "rewards": [] }`.
2. Insert a test row via SQL: `INSERT INTO user_rewards (id, user_id, reward_type, title, description, status) VALUES (gen_random_uuid(), '<test-user-id>', 'special_title', 'Pionnier AFRICASECOUR', 'Parmi les 100 premiers utilisateurs de la plateforme.', 'pending');`
3. `GET /rewards/me` again → the reward appears with the right fields.
4. Clean up the test row afterward (`DELETE FROM user_rewards WHERE id = '<id>'`).

- [ ] **Step 5: Commit**

```bash
git add src/routes/rewards.ts src/app.ts
git commit -m "feat: add rewards listing route"
```

---

### Task 7: Mobile API clients

**Files:**
- Create: `src/lib/leaderboardApi.ts`
- Create: `src/lib/rewardsApi.ts`

**Interfaces:**
- Consumes: `apiFetch` from `src/lib/api.ts` (existing).
- Produces: `type PeriodType`, `type LeaderboardEntry`, `type MyRankInfo`, `type LeaderboardResponse`, `type TitleTier`, `getWeeklyLeaderboard(token)`, `getMonthlyLeaderboard(token)`, `getTitles(token)` from `leaderboardApi.ts`; `type UserReward`, `getMyRewards(token)` from `rewardsApi.ts`. Tasks 8-11 consume these types/functions.

- [ ] **Step 1: Create the leaderboard API client**

Create `src/lib/leaderboardApi.ts`:

```ts
import { apiFetch } from './api';

export type PeriodType = 'week' | 'month';

export type LeaderboardEntry = {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  title: string;
  rank_title: string | null;
};

export type MyRankInfo = {
  rank: number;
  points: number;
  title: string;
  points_to_next_title: number | null;
  next_title: string | null;
  points_to_top100: number;
  rank_title: string | null;
  message: string;
};

export type LeaderboardResponse = {
  period: { type: PeriodType; start: string; end: string };
  entries: LeaderboardEntry[];
  me: MyRankInfo;
};

export type TitleTier = {
  title: string;
  level: number;
  min_points: number;
  max_points: number | null;
};

export function getWeeklyLeaderboard(token: string) {
  return apiFetch<LeaderboardResponse>('/leaderboard/week', { token });
}

export function getMonthlyLeaderboard(token: string) {
  return apiFetch<LeaderboardResponse>('/leaderboard/month', { token });
}

export async function getTitles(token: string) {
  const { titles } = await apiFetch<{ titles: TitleTier[] }>('/leaderboard/titles', { token });
  return titles;
}
```

- [ ] **Step 2: Create the rewards API client**

Create `src/lib/rewardsApi.ts`:

```ts
import { apiFetch } from './api';

export type UserReward = {
  id: string;
  reward_type: string;
  title: string;
  description: string;
  period_type: string | null;
  period_start: string | null;
  period_end: string | null;
  status: 'pending' | 'claimed' | 'revoked';
  awarded_at: string;
  claimed_at: string | null;
};

export async function getMyRewards(token: string) {
  const { rewards } = await apiFetch<{ rewards: UserReward[] }>('/rewards/me', { token });
  return rewards;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/leaderboardApi.ts src/lib/rewardsApi.ts
git commit -m "feat: add leaderboard and rewards API clients"
```

---

### Task 8: `TitleProgressCard` component

**Files:**
- Create: `src/components/ui/TitleProgressCard.tsx`
- Modify: `src/components/ui/index.ts`

**Interfaces:**
- Consumes: `Card` from `./Card`; `colors, spacing, typography` from `@/constants/theme`.
- Produces: `TitleProgressCard({ title, nextTitle, pointsToNext }: { title: string; nextTitle: string | null; pointsToNext: number | null })`. Tasks 9, 10, 11 all render this component (3 usages, justifying a shared component per the design decision).

- [ ] **Step 1: Create the component**

Create `src/components/ui/TitleProgressCard.tsx`:

```tsx
import { StyleSheet, Text } from 'react-native';

import { Card } from './Card';
import { colors, spacing, typography } from '@/constants/theme';

type TitleProgressCardProps = {
  title: string;
  nextTitle: string | null;
  pointsToNext: number | null;
};

// Carte réutilisée sur l'accueil, le profil et l'écran classement — le
// titre pédagogique est cumulatif (profiles.points_total), pas lié à une
// période, donc identique partout où elle est affichée.
export function TitleProgressCard({ title, nextTitle, pointsToNext }: TitleProgressCardProps) {
  return (
    <Card>
      <Text style={[typography.small, styles.label]}>Ton titre actuel</Text>
      <Text style={[typography.h3, styles.title]}>{title}</Text>
      {nextTitle && pointsToNext !== null ? (
        <Text style={[typography.body, styles.next]}>
          Encore {pointsToNext} points pour devenir {nextTitle}.
        </Text>
      ) : (
        <Text style={[typography.body, styles.next]}>
          Tu as atteint le titre le plus élevé. Continue pour le conserver !
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.mutedText,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.darkText,
    marginBottom: spacing.xs,
  },
  next: {
    color: colors.mutedText,
  },
});
```

- [ ] **Step 2: Export it**

In `src/components/ui/index.ts`, add:

```ts
export { TitleProgressCard } from './TitleProgressCard';
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/TitleProgressCard.tsx src/components/ui/index.ts
git commit -m "feat: add TitleProgressCard component"
```

---

### Task 9: Leaderboard screen

**Files:**
- Create: `src/app/leaderboard.tsx`

**Interfaces:**
- Consumes: `getWeeklyLeaderboard`, `getMonthlyLeaderboard`, `type PeriodType`, `type LeaderboardResponse` from `src/lib/leaderboardApi.ts` (Task 7); `TitleProgressCard` from `@/components/ui` (Task 8); `Card, ChevronStrip, Screen, StateView` from `@/components/ui` (existing); `useAuth` from `@/context/AuthContext` (existing).
- Produces: default-exported `LeaderboardScreen`, routable at `/leaderboard` (Expo Router file-based routing — same top-level pattern as the existing `src/app/passport.tsx`).

- [ ] **Step 1: Create the screen**

Create `src/app/leaderboard.tsx`:

```tsx
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, ChevronStrip, Screen, StateView, TitleProgressCard } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  type LeaderboardResponse,
  type PeriodType,
  getMonthlyLeaderboard,
  getWeeklyLeaderboard,
} from '@/lib/leaderboardApi';

// Écran classement — atteint depuis l'accueil et le profil, pas un
// onglet (même pattern que passport.tsx : router.back() suffit, pas
// besoin d'un Stack dédié pour un simple bouton retour).
export default function LeaderboardScreen() {
  const { token } = useAuth();
  const [period, setPeriod] = useState<PeriodType>('week');
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error' } | { status: 'success'; data: LeaderboardResponse }
  >({ status: 'loading' });

  const load = useCallback(async () => {
    if (!token) return;
    setState({ status: 'loading' });
    try {
      const data = period === 'week' ? await getWeeklyLeaderboard(token) : await getMonthlyLeaderboard(token);
      setState({ status: 'success', data });
    } catch {
      setState({ status: 'error' });
    }
  }, [token, period]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen mode="normal" scroll>
      <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8} style={styles.backLink}>
        <Text style={[typography.bodyBold, styles.backLabel]}>← Retour</Text>
      </Pressable>

      <ChevronStrip />
      <Text style={[typography.h2, styles.spaced]}>Classement AFRICASECOUR</Text>

      <View style={[styles.toggleRow, styles.spaced]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setPeriod('week')}
          style={[styles.toggleButton, period === 'week' && styles.toggleButtonActive]}>
          <Text style={[typography.bodyBold, period === 'week' ? styles.toggleTextActive : styles.toggleText]}>
            Cette semaine
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setPeriod('month')}
          style={[styles.toggleButton, period === 'month' && styles.toggleButtonActive]}>
          <Text style={[typography.bodyBold, period === 'month' ? styles.toggleTextActive : styles.toggleText]}>
            Ce mois
          </Text>
        </Pressable>
      </View>

      {state.status === 'loading' ? <StateView state="loading" /> : null}
      {state.status === 'error' ? (
        <StateView state="error" message="Le chargement du classement a échoué." onRetry={load} />
      ) : null}

      {state.status === 'success' ? (
        <>
          <View style={styles.spaced}>
            <Card>
              <Text style={typography.bodyBold}>{state.data.me.message}</Text>
              <Text style={[typography.data, styles.muted]}>
                Rang {state.data.me.rank} · {state.data.me.points} points
              </Text>
              {state.data.me.rank_title ? (
                <Text style={[typography.small, styles.rankTitle]}>{state.data.me.rank_title}</Text>
              ) : null}
            </Card>
          </View>

          <View style={styles.spaced}>
            <TitleProgressCard
              title={state.data.me.title}
              nextTitle={state.data.me.next_title}
              pointsToNext={state.data.me.points_to_next_title}
            />
          </View>

          <View style={styles.spaced}>
            <Text style={[typography.bodyBold, styles.sectionTitle]}>Top 100</Text>
            {state.data.entries.length === 0 ? (
              <Text style={[typography.body, styles.muted]}>
                Personne n'a encore gagné de points {period === 'week' ? 'cette semaine' : 'ce mois-ci'}.
              </Text>
            ) : (
              state.data.entries.map((entry) => (
                <Card key={entry.user_id} style={styles.entryCard}>
                  <Text style={[typography.data, styles.entryRank]}>{entry.rank}</Text>
                  <View style={styles.entryInfo}>
                    <Text style={typography.body}>{entry.display_name}</Text>
                    <Text style={[typography.small, styles.muted]}>{entry.title}</Text>
                  </View>
                  <Text style={[typography.data, styles.entryPoints]}>{entry.points}</Text>
                </Card>
              ))
            )}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backLink: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  backLabel: {
    color: colors.trustBlue,
  },
  spaced: {
    marginTop: spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.trustBlue,
    borderColor: colors.trustBlue,
  },
  toggleText: {
    color: colors.darkText,
  },
  toggleTextActive: {
    color: colors.white,
  },
  muted: {
    color: colors.mutedText,
    marginTop: spacing.xs,
  },
  rankTitle: {
    color: colors.trustBlue,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  entryRank: {
    color: colors.trustBlue,
    width: 32,
  },
  entryInfo: {
    flex: 1,
  },
  entryPoints: {
    color: colors.trustBlue,
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Start the app (`npx expo start --web` is fine for this check) and navigate directly to `/leaderboard` (temporarily, e.g. by typing the URL in web mode, or a temporary `router.push('/leaderboard')` call — remove any temporary navigation trigger before finishing this task, Task 10 adds the real one). Confirm: the week/month toggle switches data, the "me" card shows a message, the Top 100 list renders, back button returns to the previous screen.

- [ ] **Step 4: Commit**

```bash
git add src/app/leaderboard.tsx
git commit -m "feat: add leaderboard screen"
```

---

### Task 10: Home screen — "Défi Secours de la semaine" card

**Files:**
- Modify: `src/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `getWeeklyLeaderboard` from `src/lib/leaderboardApi.ts` (Task 7); existing `Card`, `router` usage patterns already in this file.

- [ ] **Step 1: Fetch the weekly leaderboard alongside existing home data**

In `src/app/(tabs)/index.tsx`, add the import alongside the existing `@/lib/*` imports:

```ts
import { type LeaderboardResponse, getWeeklyLeaderboard } from '@/lib/leaderboardApi';
```

Extend the `HomeData` type:

```ts
type HomeData = {
  profile: AuthUser;
  courses: Course[];
  missions: Mission[];
  kits: Kit[];
  leaderboard: LeaderboardResponse | null;
};
```

In `load()`, add `getWeeklyLeaderboard(token)` to the `Promise.all`. Since a leaderboard failure must never block the rest of the home screen from loading, wrap it in its own `.catch(() => null)` rather than letting one failed call reject the whole `Promise.all`:

```ts
  const load = useCallback(async () => {
    if (!token) return;
    setState({ status: 'loading' });
    try {
      const [profile, courses, missions, kits, leaderboard] = await Promise.all([
        getProfile(token),
        getCourses(token),
        getMissions(token),
        getKits(),
        getWeeklyLeaderboard(token).catch(() => null),
      ]);
      setState({ status: 'success', data: { profile, courses, missions, kits, leaderboard } });
    } catch {
      setState({
        status: 'error',
        message: "Le chargement de l'accueil a échoué. Vérifiez votre connexion et réessayez.",
      });
    }
  }, [token]);
```

Update the destructuring line to include it:

```ts
  const { profile, courses, missions, kits, leaderboard } = state.data;
```

- [ ] **Step 2: Add the card**

Insert a new `View` block right after the "Progression globale" section (after its closing `</View>` at line ~141) and before "Reprendre un cours" (~143):

```tsx
      {leaderboard ? (
        <View style={styles.spaced}>
          <Text style={[typography.bodyBold, styles.sectionTitle]}>Défi Secours de la semaine</Text>
          <Pressable onPress={() => router.push('/leaderboard')}>
            <Card>
              <Text style={typography.body}>{leaderboard.me.message}</Text>
              <Text style={[typography.data, styles.muted]}>
                Rang {leaderboard.me.rank} cette semaine · {leaderboard.me.points} points
              </Text>
            </Card>
          </Pressable>
        </View>
      ) : null}
```

(No new styles needed — `styles.spaced`, `styles.sectionTitle`, and `styles.muted` already exist in this file.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Reload the home screen — confirm the new card appears between "Progression globale" and "Reprendre un cours" without shifting/breaking any other section, and tapping it navigates to `/leaderboard`. Confirm the screen still loads fine even if `/leaderboard/week` is made to fail temporarily (e.g. stop the backend and reload) — the rest of the home screen must still render (the `.catch(() => null)` guard is what's being verified here).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(tabs)/index.tsx"
git commit -m "feat: add weekly challenge card to home screen"
```

---

### Task 11: Profile screen — "Mon classement / Mes titres" link

**Files:**
- Modify: `src/app/(tabs)/profile.tsx`

**Interfaces:**
- Consumes: none new (pure navigation link, no data fetch — the leaderboard screen itself fetches everything it needs).

- [ ] **Step 1: Add the link**

In `src/app/(tabs)/profile.tsx`, insert a new row between the reminders row (ends with `</View>` after the `<Switch .../>`, around line 189) and the "Se déconnecter" button:

```tsx
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/leaderboard')}
        style={styles.leaderboardRow}>
        <Text style={typography.bodyBold}>Mon classement / Mes titres</Text>
        <Text style={[typography.small, styles.muted]}>Voir mon rang et ma progression</Text>
      </Pressable>
```

Add the `router` import at the top of the file (not currently imported in this screen):

```ts
import { router } from 'expo-router';
```

Add the matching style to the `StyleSheet.create` block, alongside `remindersRow`:

```ts
  leaderboardRow: {
    marginTop: spacing.md,
    minHeight: 64,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    gap: spacing.xs,
  },
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Reload the profile screen — confirm the new row appears above "Se déconnecter", doesn't disturb the avatar/form/reminders sections above it, and tapping it navigates to `/leaderboard`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(tabs)/profile.tsx"
git commit -m "feat: add leaderboard link to profile screen"
```

---

## End-to-end verification (after all tasks)

1. `npx tsc --noEmit` clean in both repos.
2. Full non-regression pass: auth, home, Academy (course → video → lessons → quiz → simulation → mission → badge → passport) all still work exactly as before — no route, type, service, component, or design-system change outside what's listed above.
3. Revision points: pass a quiz, note `points_total`; pass it again same day → +5 once; a third pass same day → +0; confirm via `points_transactions`.
4. `/leaderboard/week` and `/leaderboard/month` never contain `email` in any field, at any nesting level.
5. A user with no `full_name` shows as `Secouriste #XXXX` in the Top 100 list, never their email.
6. A user outside the Top 100 still sees a correct `rank`/`points`/motivational `message` in the `me` block.
7. Title matches the grid (e.g. exactly 250 points → "Réflexe Secours"; exactly 5000 points → "Maître des Bons Gestes" with `next_title: null`).
8. A `user_rewards` row inserted via SQL appears correctly via `GET /rewards/me`, and disappears from the response once deleted.
9. Home screen still renders fully (with the rest of its sections intact) even if the leaderboard fetch fails.
10. IA SOS flow untouched — still only ever awards points on the very first session, confirmed by re-reading `src/routes/sos.ts` unchanged in the diff.
