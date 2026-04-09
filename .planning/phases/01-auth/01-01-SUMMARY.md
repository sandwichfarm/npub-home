---
phase: 01-auth
plan: 01
subsystem: testing
tags: [vitest, jsdom, applesauce-signers, lean-qr, testing-library, svelte5]

# Dependency graph
requires: []
provides:
  - vitest test runner configured for Svelte 5 + jsdom
  - applesauce-signers@5.2.0 runtime dependency installed
  - lean-qr@2.7.1 runtime dependency installed
  - auth test stubs (17 todos covering AUTH-01 through AUTH-07)
  - QR test stubs (3 todos covering AUTH-03, AUTH-04)
affects: [01-02, 01-03, 01-04]

# Tech tracking
tech-stack:
  added:
    - vitest@4.1.4
    - "@vitest/coverage-v8@4.1.4"
    - jsdom@29.0.2
    - "@testing-library/svelte@5.3.1"
    - "@testing-library/jest-dom@6.9.1"
    - applesauce-signers@5.2.0
    - lean-qr@2.7.1
  patterns:
    - "Test stubs with it.todo() for forward-declared test coverage"
    - "vitest.config.ts uses resolve.alias for $lib path mapping (no vite-tsconfig-paths)"
    - "jsdom environment for DOM/browser API simulation in tests"

key-files:
  created:
    - vitest.config.ts
    - src/lib/__tests__/setup.ts
    - src/lib/__tests__/auth.test.ts
    - src/lib/__tests__/qr.test.ts
  modified:
    - package.json

key-decisions:
  - "Used resolve.alias instead of vite-tsconfig-paths for $lib mapping (not installed, not needed)"
  - "All test stubs use it.todo() so vitest exits 0 before implementation exists"

patterns-established:
  - "Pattern 1: Test stubs in src/lib/__tests__/ using it.todo() describe the expected behavior before any implementation file exists"
  - "Pattern 2: vitest.config.ts is separate from vite.config.ts — vitest does not extend the SvelteKit vite config to avoid adapter conflicts"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07]

# Metrics
duration: 5min
completed: 2026-04-09
---

# Phase 01 Plan 01: Test Framework Bootstrap Summary

**vitest installed with jsdom + svelte plugin, applesauce-signers and lean-qr added, 20 it.todo stubs covering AUTH-01 through AUTH-07 pass green**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-09T11:18:00Z
- **Completed:** 2026-04-09T11:23:13Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Installed `applesauce-signers@5.2.0` and `lean-qr@2.7.1` as runtime dependencies — both now available for Wave 1 implementation
- Installed `vitest@4.1.4` with `jsdom`, `@testing-library/svelte`, and `@testing-library/jest-dom`; configured via `vitest.config.ts` with Svelte plugin and `$lib` alias
- Created 20 `it.todo()` stubs in two test files (auth.test.ts and qr.test.ts) covering all 7 AUTH requirements; `pnpm vitest run` exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Install runtime dependencies and vitest** - `b5ff407` (chore)
2. **Task 2: Create vitest.config.ts** - `89d9126` (chore)
3. **Task 3: Create auth test stubs** - `1729266` (test)

## Files Created/Modified

- `package.json` - Added applesauce-signers, lean-qr, vitest and testing libraries; added "test": "vitest run" script
- `pnpm-lock.yaml` - Updated lockfile for new dependencies
- `vitest.config.ts` - Vitest config with svelte plugin, jsdom environment, $lib alias, setupFiles pointing to setup.ts
- `src/lib/__tests__/setup.ts` - Imports @testing-library/jest-dom for custom matchers
- `src/lib/__tests__/auth.test.ts` - 17 it.todo stubs for AUTH-01, AUTH-02, AUTH-03, AUTH-05, AUTH-06, AUTH-07
- `src/lib/__tests__/qr.test.ts` - 3 it.todo stubs for AUTH-03, AUTH-04

## Decisions Made

- Used `resolve.alias` in vitest.config.ts instead of `vite-tsconfig-paths` (package not installed; direct alias is simpler and sufficient)
- Kept `vitest.config.ts` separate from `vite.config.ts` to avoid importing the SvelteKit plugin in a test-only context which could cause adapter conflicts

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 0 blockers cleared: vitest framework ready, applesauce-signers importable, lean-qr importable
- Plan 02 can now implement `auth.svelte.ts` (auth singleton) and fill in the auth.test.ts stubs
- Plan 03 can implement `RemoteSignerTab.svelte` and fill in qr.test.ts stubs

---
*Phase: 01-auth*
*Completed: 2026-04-09*
