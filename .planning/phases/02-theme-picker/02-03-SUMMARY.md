---
phase: 02-theme-picker
plan: 03
subsystem: ui
tags: [svelte5, nostr, nip-65, theme-picker, kind-10002, kind-16767]

# Dependency graph
requires:
  - phase: 02-theme-picker plan 01
    provides: theme.ts utilities (parseThemeDefinition, getOutboxes integration, BOOTSTRAP_RELAYS)
  - phase: 02-theme-picker plan 02
    provides: ThemePicker.svelte modal component with signer/pool/pubkey/writeRelays/onclose props
  - phase: 01-auth
    provides: getSigner(), isOwner(), restoreSession() from auth.svelte.ts
provides:
  - OwnerBadge with Theme button that emits ontheme callback to parent
  - +page.svelte conditionally renders ThemePicker with all required props
  - writeRelays derived from kind 10002 (NIP-65) events via getOutboxes(), falls back to BOOTSTRAP_RELAYS
  - Complete end-to-end theme picker flow reachable from the UI
affects: [future nsite-management phases that modify +page.svelte, any phase extending OwnerBadge]

# Tech tracking
tech-stack:
  added: [applesauce-core/helpers/mailboxes (getOutboxes)]
  patterns: [kind 10002 relay list subscription for write relay resolution, ontheme callback prop pattern for modal trigger]

key-files:
  created: []
  modified:
    - src/lib/components/OwnerBadge.svelte
    - src/routes/+page.svelte

key-decisions:
  - "writeRelays computed via getOutboxes() on kind 10002 subscription; falls back to BOOTSTRAP_RELAYS when unavailable"
  - "ThemePicker non-null assertion getSigner()! is safe — showThemePicker is only set true from OwnerBadge inside isOwner() guard"

patterns-established:
  - "Modal trigger pattern: parent holds showX state, child component emits onX callback prop, +page.svelte conditionally renders modal"
  - "Relay list pattern: kind 10002 subscription feeds writeRelays state via getOutboxes() from applesauce-core/helpers/mailboxes"

requirements-completed: [THEME-01]

# Metrics
duration: 5min
completed: 2026-04-09
---

# Phase 2 Plan 3: UI Wiring Summary

**Theme button wired into OwnerBadge via ontheme prop; ThemePicker rendered conditionally in +page.svelte with writeRelays derived from kind 10002 NIP-65 subscription**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-09T12:28:00Z
- **Completed:** 2026-04-09T12:29:43Z
- **Tasks:** 2 (1 auto + 1 checkpoint auto-approved)
- **Files modified:** 2

## Accomplishments

- Added optional `ontheme` prop and "Theme" button to OwnerBadge.svelte alongside existing "Log out" button
- Wired `showThemePicker` state and ThemePicker conditional render into +page.svelte
- Subscribed to kind 10002 events in +page.svelte to derive `writeRelays` via `getOutboxes()` with BOOTSTRAP_RELAYS fallback
- All 50 vitest tests pass; svelte-check reports 0 errors and 0 warnings

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Theme button to OwnerBadge and wire ThemePicker into +page.svelte** - `8b5e801` (feat)
2. **Task 2: End-to-end verification checkpoint** - auto-approved (auto_advance: true)

**Plan metadata:** _(docs commit — see below)_

## Files Created/Modified

- `src/lib/components/OwnerBadge.svelte` - Added ontheme prop and Theme button before Log out
- `src/routes/+page.svelte` - Imported ThemePicker, getOutboxes, pool, BOOTSTRAP_RELAYS; added showThemePicker and writeRelays state; kind 10002 subscription for writeRelays; ThemePicker conditional render; ontheme prop passed to OwnerBadge

## Decisions Made

- `getSigner()!` non-null assertion in ThemePicker props is safe because `showThemePicker = true` is only reachable from inside the `{#if isOwner()}` guard, which requires a valid signer
- `writeRelays` falls back to `BOOTSTRAP_RELAYS` when no kind 10002 event is available — avoids blocking the ThemePicker if the user has no relay list published

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None — all data sources are wired. writeRelays is reactive (updates when kind 10002 arrives). ThemePicker receives live signer, pool, pubkey, and writeRelays on every open.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 (theme-picker) is fully complete: utilities, ThemePicker component, and UI wiring are all shipped
- The complete end-to-end flow is reachable: owner logs in, sees "Theme" in OwnerBadge, clicks it, gets ThemePicker modal, can browse/preview/apply themes
- Next phase (nsite management) can extend OwnerBadge and +page.svelte following the same prop callback pattern established here

---
*Phase: 02-theme-picker*
*Completed: 2026-04-09*
