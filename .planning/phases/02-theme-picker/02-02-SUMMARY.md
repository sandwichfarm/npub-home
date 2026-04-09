---
phase: 02-theme-picker
plan: 02
subsystem: ui
tags: [svelte5, nostr, kind-36767, kind-16767, applesauce, relay, theme, testing-library, vitest]

# Dependency graph
requires:
  - phase: 02-theme-picker
    plan: 01
    provides: parseThemeDefinition and decodeNeventInput exported from theme.ts for kind 36767 parsing

provides:
  - ThemePicker.svelte: props-only modal component with curated kind 36767 theme browsing, live preview, nevent paste, and kind 16767 publish
  - ThemePicker.test.ts: 12 unit tests covering THEME-04 (applyTheme on select), THEME-05 (publish flow), THEME-06 (no singleton imports), and modal behavior

affects:
  - 02-theme-picker/02-03 (OwnerBadge and +page.svelte integration — will import ThemePicker)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "naddr curated theme refs decoded via dynamic import('nostr-tools').then() inside synchronous onMount — avoids async onMount cleanup conflict"
    - "Svelte 5 component tests require resolve.conditions=['browser'] in vitest.config.ts so Svelte resolves to index-client.js not index-server.js"
    - "EventFactory class mocked with function constructor (not arrow fn) per vitest requirement for new-able mocks"
    - "?raw Vite import used in test for static source analysis (THEME-06) without Node.js fs/path dependencies"
    - "MockEventFactory with shared module-level mockBuild/mockSign refs — allows beforeEach reset without factory instance reference"

key-files:
  created:
    - src/lib/components/ThemePicker.svelte
    - src/lib/__tests__/ThemePicker.test.ts
  modified:
    - vitest.config.ts

key-decisions:
  - "naddr curated refs decoded via dynamic nip19 import inside synchronous onMount (avoids async onMount — per established project constraint)"
  - "vitest.config.ts: added resolve.conditions=['browser'] so @testing-library/svelte can render Svelte 5 components in jsdom (was using server bundle)"
  - "EventFactory mocked with function constructor + shared mockBuild/mockSign refs instead of vi.fn(() => instance) to satisfy vitest class mock requirement"
  - "?raw Vite import for THEME-06 static source check — avoids Node.js fs/path which lack types in this project"
  - "8 real curated naddr references surveyed from wss://relay.damus.io, wss://nos.lol, wss://purplepag.es on 2026-04-09"

patterns-established:
  - "ThemePicker follows props-only design: signer, pool, pubkey, writeRelays, onclose — no singleton imports"
  - "Curated naddr fetch: synchronous onMount + dynamic nip19 import inside .then() + pool.req() subscription array + setTimeout for loading=false"
  - "Source event tags copied directly to kind 16767 (c/f/bg tags) — avoids hex/HSL round-trip pitfall"

requirements-completed:
  - THEME-02
  - THEME-03
  - THEME-04
  - THEME-05
  - THEME-06

# Metrics
duration: 11min
completed: 2026-04-09
---

# Phase 2 Plan 02: ThemePicker.svelte Summary

**Props-only ThemePicker modal with 8 real surveyed naddr curated themes, live applyTheme preview, nevent paste, and kind 16767 publish via EventFactory — zero singleton imports, 12 tests passing**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-04-09T12:14:33Z
- **Completed:** 2026-04-09T12:25:38Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Surveyed wss://relay.damus.io, wss://nos.lol, wss://purplepag.es for real kind 36767 events; built 8-entry CURATED_THEMES constant with verified naddr bech32 references (Mediterranean Dream, Cosmos, Slate, Halloween, Circuit, Green Light, North Woods, Venator)
- Built complete ThemePicker.svelte: curated naddr fetch via synchronous onMount + dynamic nip19 import, live applyTheme preview on card click, clearTheme on close/cancel, nevent/naddr paste handler, EventFactory.build+sign+pool.publish for kind 16767
- 12 unit tests in ThemePicker.test.ts covering THEME-04 (applyTheme called on select), THEME-05 (EventFactory/pool.publish flow + writeRelays vs BOOTSTRAP_RELAYS), THEME-06 (static singleton import check via ?raw), and modal button behaviors
- Fixed Svelte 5 jsdom testing by adding `resolve.conditions: ['browser']` to vitest.config.ts — prevents "mount is not available on the server" error

## Task Commits

1. **Task 1: Survey relay for curated themes and create ThemePicker skeleton** - `7b75d5e` (feat)
2. **Task 2: Complete ThemePicker modal and tests** - `7dacd6d` (feat)

## Files Created/Modified
- `src/lib/components/ThemePicker.svelte` - Complete props-only ThemePicker modal (391 lines)
- `src/lib/__tests__/ThemePicker.test.ts` - 12 unit tests using @testing-library/svelte
- `vitest.config.ts` - Added `resolve.conditions: ['browser']` for Svelte 5 component tests

## Decisions Made
- **naddr curated refs decoded via dynamic nip19 import inside synchronous onMount**: Needed because decodeNeventInput (which wraps nip19) returns empty id for naddr refs, so curated fetch uses a second loop with `import('nostr-tools').then()` to get kind+pubkey+d-tag filter data. Keeps onMount synchronous per project constraint.
- **vitest.config.ts resolve.conditions=['browser']**: Svelte 5 exports use `browser` condition for client bundle. Without this, jsdom tests import `index-server.js` which throws "mount is not available on the server".
- **EventFactory mocked with function constructor + shared mockBuild/mockSign**: vitest warns when `vi.fn()` is used as a class mock without `function`/`class` syntax. Shared refs allow beforeEach reset.
- **?raw import for THEME-06 static source check**: Project lacks @types/node, so fs/path/`__dirname` fail svelte-check. Vite's `?raw` suffix provides file content as string with zero Node deps.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added resolve.conditions=['browser'] to vitest.config.ts**
- **Found during:** Task 2 (ThemePicker tests)
- **Issue:** @testing-library/svelte render() threw "mount is not available on the server" — Svelte 5 loaded server bundle in jsdom environment
- **Fix:** Added `resolve: { conditions: ['browser'], ... }` to vitest.config.ts
- **Files modified:** vitest.config.ts
- **Verification:** Full test suite (50 tests) passes after fix
- **Committed in:** 7dacd6d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (blocking — vitest config)
**Impact on plan:** Essential for component test infrastructure. No scope creep. All existing tests still pass.

## Issues Encountered
- vitest `vi.fn()` class mock warning for EventFactory — resolved by using `function MockEventFactory(this: any) {...}` constructor pattern with shared module-level `mockBuild`/`mockSign` refs
- `?raw` Vite import approach used for THEME-06 static check after discovering project lacks `@types/node` (path/fs/`__dirname` fail svelte-check type checking)

## Known Stubs
None — all 8 curated themes are real naddr references to live kind 36767 events on public relays. The component wires pool.req() to actual relay subscriptions. No placeholder or mock data flows to UI rendering.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ThemePicker.svelte is complete and ready to be wired into OwnerBadge and +page.svelte (Plan 02-03)
- OwnerBadge needs a "Theme" button that opens the modal (per UI-SPEC.md)
- +page.svelte needs to: add showThemePicker state, conditionally render ThemePicker, resolve writeRelays from kind 10002 events, and pass all 5 props
- The live preview / revert-on-cancel flow relies on +page.svelte's themeSub re-applying the stored kind 16767 after ThemePicker closes and calls clearTheme() — this is already implemented in +page.svelte

---
*Phase: 02-theme-picker*
*Completed: 2026-04-09*
