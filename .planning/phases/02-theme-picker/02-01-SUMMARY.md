---
phase: 02-theme-picker
plan: 01
subsystem: ui
tags: [nostr-tools, nip19, bech32, theme, kind-36767]

# Dependency graph
requires:
  - phase: 01-auth
    provides: vitest config with $lib alias and jsdom environment established
provides:
  - parseThemeDefinition exported from src/lib/theme.ts for kind 36767 events
  - decodeNeventInput exported from src/lib/theme.ts for nevent/note/naddr bech32 decoding
  - Unit tests covering both functions (19 tests)
affects:
  - 02-theme-picker/02-02 (ThemePicker.svelte will import these two functions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Font family CSS injection sanitization via /^[A-Za-z0-9 _-]+$/ regex guard before DOM injection"
    - "nip19.decode() wrapped in try/catch with null return on any failure"
    - "TDD: test file written first (RED), then implementation (GREEN)"

key-files:
  created:
    - src/lib/__tests__/theme.test.ts
  modified:
    - src/lib/theme.ts

key-decisions:
  - "nip19 imported as named export from nostr-tools alongside existing type-only NostrEvent import"
  - "Font family sanitization: reject whole font (return undefined) when family fails regex — not strip the value — to avoid partial injection"
  - "naddr handling: id set to empty string, relays passed through — caller fetches by kind+pubkey+d-tag"

patterns-established:
  - "parseThemeDefinition follows same guard-clause pattern as parseActiveProfileTheme (kind check first, then parseColorTags, then optional fields)"
  - "decodeNeventInput uses try/catch around nip19.decode to handle all invalid input cases uniformly"

requirements-completed:
  - THEME-02
  - THEME-03

# Metrics
duration: 10min
completed: 2026-04-09
---

# Phase 2 Plan 01: theme.ts utility functions Summary

**parseThemeDefinition and decodeNeventInput exported from theme.ts — kind 36767 parsing with CSS injection guard and nip19 bech32 decoding for nevent/note/naddr inputs**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-09T12:02:00Z
- **Completed:** 2026-04-09T12:12:44Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Added `parseThemeDefinition()` to theme.ts: parses kind 36767 events using the existing private helpers (parseColorTags, parseFontTag, parseBackgroundTag); includes font family CSS injection sanitization guard
- Added `decodeNeventInput()` to theme.ts: decodes nevent/note/naddr bech32 strings via nip19.decode, returning id + relay hints or null
- Added nip19 import from nostr-tools to theme.ts
- 19 unit tests covering all plan-specified behaviors, all passing

## Task Commits

1. **Task 1: Add parseThemeDefinition() and decodeNeventInput() to theme.ts** - `2e76c44` (feat)

## Files Created/Modified
- `src/lib/theme.ts` - Added nip19 import, parseThemeDefinition export, decodeNeventInput export
- `src/lib/__tests__/theme.test.ts` - New: 19 unit tests for both functions

## Decisions Made
- nip19 imported as named export on a second import line (keeping type-only import separate for clarity)
- Font sanitization rejects the entire font object (sets to undefined) rather than stripping invalid characters — prevents partial injection scenarios
- naddr handling sets id to empty string and passes relay hints — per plan spec, caller resolves by kind+pubkey+d-tag

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `parseThemeDefinition` and `decodeNeventInput` are exported and callable from ThemePicker.svelte
- Both functions are pure utilities with no singleton imports — ready for extraction as standalone package
- Plan 02-02 (ThemePicker.svelte component) can proceed immediately

---
*Phase: 02-theme-picker*
*Completed: 2026-04-09*
