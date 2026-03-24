# FocusBuddy Production Readiness Audit — V6

**Post-Dependency Modernization Assessment**
**Date:** March 15, 2026
**Score Trajectory:** V1: 24 → V2: 38 → V3: 62 → V4: 85 → V5: 87 → **V6: 78**

---

## Executive Summary

### Overall Score: 78/100

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Security | 25% | 22/25 | 22.0 |
| Correctness | 20% | 14/20 | 14.0 |
| Tests | 15% | 11/15 | 11.0 |
| Infrastructure | 15% | 13/15 | 13.0 |
| Performance | 10% | 7/10 | 7.0 |
| Code Quality | 10% | 8/10 | 8.0 |
| UX Resilience | 5% | 3/5 | 3.0 |
| **Total** | **100%** | | **78.0** |

**Score Change from V5:** -9 points. This is NOT a regression in code quality — it reflects a more thorough audit that discovered pre-existing architectural issues (dual timer systems, session creation timing) that were not fully captured in V5, plus new technical debt from the Supabase v2.99 type regression requiring 20+ type casts.

### Key Changes in V6
1. **Dependencies modernized** — 11 packages upgraded, 1 new package added
2. **Supabase JS 2.46→2.99** — Major internal rewrite requiring `as unknown as Type` casts across 20+ query sites
3. **TypeScript 5.8→5.9** — Stricter type checking caught additional issues
4. **ESLint 10 rejected** — Plugin ecosystem not yet compatible; stayed on v9
5. **All verification gates green** — 0 TS errors, 332 tests passing, 0 lint errors

---

## Dependency Upgrade Summary

### Upgraded Packages

| Package | From | To | Risk |
|---------|------|----|------|
| @supabase/supabase-js | 2.46.2 | 2.99.1 | Minor (type changes) |
| @react-navigation/native | 7.1.28 | 7.1.33 | Patch |
| react | 19.2.0 | 19.2.4 | Patch |
| react-dom | 19.2.0 | 19.2.4 | Patch |
| react-native-reanimated | 4.2.1 | 4.2.2 | Patch |
| react-native-safe-area-context | 5.6.2 | 5.7.0 | Minor |
| react-native-screens | 4.23.0 | 4.24.0 | Minor |
| react-native-worklets | 0.7.2 | 0.7.4 | Patch |
| typescript | 5.8.3 | 5.9.3 | Minor |
| @types/react | 19.2.2 | 19.2.14 | Patch |
| react-test-renderer | — | 19.2.4 | NEW |

### Intentionally Skipped

| Package | Current | Latest | Reason |
|---------|---------|--------|--------|
| tailwindcss | 3.4.19 | 4.2.1 | NativeWind v4 requires TW3; TW4 is incompatible rewrite |
| react-native | 0.83.2 | 0.84.1 | Expo SDK 55 pins RN 0.83.x |
| react-native-web | 0.21.0 | — | Expo SDK 55 pins this version |
| eslint | 9.39.4 | 10.0.3 | Plugins don't support ESLint 10; Node engine mismatch |

### Breaking Changes Resolved
- **Supabase v2.99 type regression**: postgrest-js changed internal type resolution, causing all `.select('*')` queries to return `{}` instead of typed rows. Fixed with `as unknown as Type` casts across 8 service files, 4 store files, and 1 screen file.
- **react-test-renderer version mismatch**: React 19.2.4 required matching test renderer; added `react-test-renderer@19.2.4` as dev dependency.

---

## Issues by Severity

### CRITICAL (4 issues)

**C1: Dual Timer State Systems**
- Files: `app/timer.tsx`, `src/stores/sessionStore.ts`, `src/lib/mmkv.ts`
- `timer.tsx` uses raw MMKV keys (`timer.startedAt`, `timer.pausedAt`, `timer.isPaused`) while `sessionStore.ts` uses `src/lib/mmkv.ts` helper functions (key: `timer_state`). These are two completely separate timer state systems. If a user starts a timer via the screen, `sessionStore.restoreTimerFromMMKV()` will find nothing. If restored from store, the screen won't see it.
- **Fix:** Unify on a single timer state system using `src/lib/mmkv.ts`.

**C2: Session Creation Timing**
- File: `app/session-rating.tsx`
- The session record is created AND immediately ended in the rating screen. During the actual timer running, NO focus_session row exists in the database. This means: no crash recovery for active sessions, no visibility into running sessions, and incorrect session duration if the app crashes.
- **Fix:** Create the session record when the timer starts, update it on end.

**C3: Sign-Up Profile Gap**
- File: `app/(auth)/sign-up.tsx`
- Calls `supabase.auth.signUp` directly instead of `auth.service.ts signUp()`. The service creates a profile row; the direct call does not. Users who sign up through the app will have no profile row, causing null dereferences throughout the app.
- **Fix:** Use `auth.service.ts signUp()` or create a Supabase trigger to auto-create profiles.

**C4: check_in_id Undefined Cast**
- File: `src/stores/sessionStore.ts`, line 81
- `check_in_id: undefined as unknown as string` — this unsafe cast will insert `undefined` (serialized as `null`) if the column is NOT NULL, causing a DB constraint violation.
- **Fix:** Omit `check_in_id` from insert if not required, or pass actual value.

### HIGH (8 issues)

**H1: Chat Store/Screen Divergence**
- `chatStore.sendMessage` inserts a user message to DB but does NOT call the ai-chat Edge Function. `app/(tabs)/chat.tsx` calls the Edge Function directly. The store is unused for the primary chat flow.

**H2: Rate Limit Mismatch**
- `chat.service.ts`: 20 messages/day. `chatStore`: 100 messages/hour. These are different systems with different limits.

**H3: Data Export UI Mismatch**
- `app/data-export.tsx` UI text says "sent to email within 24 hours" but code uses `Share.share()` for instant export.

**H4: useTimer Elapsed Calculation Bug**
- `src/hooks/useTimer.ts` `calculateElapsed` in running state only computes `(now - startedAt) / 1000` without adding `elapsedSecsBeforePause`, causing timer to reset to 0 after pause/resume.

**H5: RevenueCat appUserID Not Set**
- `subscriptionStore.initialize()` calls `Purchases.configure({ apiKey })` without setting `appUserID`. This means RevenueCat can't match users to their purchases after reinstall.

**H6: Promise Update Missing Auth Check**
- `promises.service.ts updatePromise` accepts any promise ID without verifying the caller owns it. RLS may protect, but defense-in-depth is missing.

**H7: activate-trial Column Mismatch**
- `supabase/functions/activate-trial/index.ts` inserts `plan_type`, `trial_end`, `current_period_start`, `current_period_end` — none of these exist in the `subscriptions` table type definition in `database.ts`.

**H8: Supabase v2.99 Type Regression**
- All `.select('*')` queries return `{}` due to postgrest-js internal changes. 20+ files now have `as unknown as Type` casts. This is a maintenance burden and masks future type errors.

### MEDIUM (8 issues)

| ID | Issue | File |
|----|-------|------|
| M1 | No rate limiting on data-export endpoint | `app/data-export.tsx` |
| M2 | getSessionStats uses limit 10000 (no pagination) | `src/services/sessions.service.ts` |
| M3 | Streak update is N+1 (separate RPC after check-in) | `src/services/checkin.service.ts` |
| M4 | Timer setInterval cleanup incomplete in some unmount paths | `app/timer.tsx` |
| M5 | No offline handling/queueing for failed API calls | Project-wide |
| M6 | Webhook idempotency uses 1s timestamp window, not event ID table | `revenuecat-webhook/index.ts` |
| M7 | Trial banner hardcoded to `false` in home screen | `app/(tabs)/index.tsx` |
| M8 | Promise history has no date range cap (unbounded query) | `src/services/promises.service.ts` |

### LOW (7 issues)

| ID | Issue | File |
|----|-------|------|
| L1 | 20+ `as unknown as Type` casts from Supabase v2.99 | Multiple |
| L2 | `as any` casts for non-existent profile fields | `app/(tabs)/settings.tsx` |
| L3 | Missing accessibility labels on interactive elements | Multiple screens |
| L4 | No keyboard avoidance on some form screens | Multiple |
| L5 | 5 low-severity npm audit vulnerabilities | `package-lock.json` |
| L6 | Dead `two` tab reference in tab layout | `app/(tabs)/_layout.tsx` |
| L7 | Console.log statements in production code paths | Multiple |

---

## Scoring Breakdown

### Security: 22/25
- ✅ HMAC-SHA256 webhook signature verification with constant-time comparison
- ✅ Input sanitization for AI prompts (`sanitizeForPrompt`)
- ✅ UUID validation on webhook user IDs
- ✅ Server-side rate limiting via PostgreSQL row locking
- ✅ JWT auth on all Edge Functions
- ✅ SecureStore for auth token persistence
- ✅ Sentry with header scrubbing
- ⚠️ No userId check on promise updates (H6)
- ⚠️ No rate limit on data export (M1)
- ⚠️ RevenueCat appUserID not set (H5)

### Correctness: 14/20
- ✅ CAS-style atomic shield updates
- ✅ Optimistic updates with rollback
- ✅ Edge Function error handling with proper HTTP status codes
- ❌ Dual timer systems will desync (C1)
- ❌ Session not created until rating screen (C2)
- ❌ Sign-up doesn't create profile (C3)
- ❌ useTimer elapsed calculation bug (H4)
- ⚠️ Chat store/screen divergence (H1)

### Tests: 11/15
- ✅ 332 tests across 22 suites
- ✅ All services have unit tests
- ✅ Store tests for auth, session, goal
- ✅ Component tests (Button, Card, ErrorBoundary)
- ✅ Utility tests (time, constants)
- ✅ Hook tests (useAppState)
- ⚠️ No screen/integration tests
- ⚠️ No chatStore or subscriptionStore tests
- ⚠️ No useTimer hook tests
- ⚠️ No Edge Function tests

### Infrastructure: 13/15
- ✅ CI/CD with GitHub Actions (typecheck, lint, test)
- ✅ ESLint 9 flat config with TypeScript rules
- ✅ Prettier formatting
- ✅ TypeScript strict mode — 0 errors
- ✅ Sentry error monitoring
- ✅ ErrorBoundary component
- ⚠️ No staging environment
- ⚠️ No database migration tooling

### Performance: 7/10
- ✅ MMKV for synchronous timer state (no async overhead)
- ✅ Zustand for lightweight state management
- ⚠️ Missing React.memo, useMemo, useCallback throughout
- ⚠️ getSessionStats limit 10000 (no pagination)
- ⚠️ N+1 streak update pattern
- ⚠️ No request deduplication or caching

### Code Quality: 8/10
- ✅ Consistent file structure (services, stores, hooks, components)
- ✅ TypeScript throughout (no .js files)
- ✅ Type aliases (not interfaces) for postgrest-js compatibility
- ✅ Clear separation of concerns
- ⚠️ 20+ type casts from Supabase upgrade (tech debt)
- ⚠️ Dual patterns for same operations (timer, chat)

### UX Resilience: 3/5
- ✅ ErrorBoundary catches React crashes
- ✅ Loading states on most async operations
- ✅ 30-day inactivity auto-logout
- ⚠️ No offline mode or request queueing
- ⚠️ Missing keyboard avoidance on some screens

---

## Recommendations

### Priority 1: Unify Timer Systems (C1 + C2)
Merge `app/timer.tsx` raw MMKV usage with `sessionStore`/`mmkv.ts`. Create the session record on timer start, not on rating.

### Priority 2: Fix Sign-Up Profile Creation (C3)
Either use `auth.service.ts signUp()` in the sign-up screen or add a Supabase database trigger to auto-create profiles on `auth.users` insert.

### Priority 3: Fix Chat Architecture (H1 + H2)
Unify chat flow: `chatStore.sendMessage()` should call the Edge Function and handle the response. Remove direct Edge Function calls from `chat.tsx`.

### Priority 4: Resolve Supabase Type Regression (H8)
Investigate whether updating the Database type definition's `Relationships` format (from `[]` to the new expected format) can restore proper type inference, eliminating 20+ type casts.

### Priority 5: Add Screen-Level Tests
Priority screens to test: check-in flow, timer flow, session-rating flow (where most critical bugs live).

---

## Verification Status

| Check | Result |
|-------|--------|
| TypeScript (`tsc --noEmit`) | ✅ 0 errors |
| Jest (`npx jest`) | ✅ 332 tests passed, 22 suites |
| ESLint (`eslint .`) | ✅ 0 errors, 41 warnings |
| npm audit | ⚠️ 5 low severity |

---

*Generated by Claude Code — FAANG-level codebase audit, V6*
