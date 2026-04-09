---
phase: 01-auth
plan: 03
subsystem: auth
tags: [svelte5, login-modal, nip07, nip46, lean-qr, nostrconnect, tailwind]

requires:
  - phase: 01-auth plan 02
    provides: auth.svelte.ts singleton with loginWithExtension, loginWithBunker, createNostrConnectSigner, finishNostrConnectLogin exports

provides:
  - LoginModal.svelte: modal overlay shell with Escape key, backdrop click, tab switcher, aria attributes
  - ExtensionTab.svelte: NIP-07 login tab with extension detection, connect button, error display
  - RemoteSignerTab.svelte: NIP-46 tab with lean-qr QR canvas, live relay update, bunker URI paste
  - src/lib/__tests__/qr.test.ts: 2 passing tests covering QR render colors and URI passthrough

affects: [01-auth-04, phase-02-theme]

tech-stack:
  added: []
  patterns:
    - "Svelte 5 component receiving onClose prop — no singleton imports, closeable externally"
    - "lean-qr generate(uri).toCanvas(canvas, opts) called inside $effect for reactive re-render"
    - "NostrConnectSigner recreated on relay field oninput (no debounce — synchronous lean-qr)"
    - "TDD RED→GREEN: failing test stubs replaced with real mock-based unit tests then implementation written"

key-files:
  created:
    - src/lib/components/LoginModal.svelte
    - src/lib/components/LoginModal/ExtensionTab.svelte
    - src/lib/components/LoginModal/RemoteSignerTab.svelte
  modified:
    - src/lib/__tests__/qr.test.ts

key-decisions:
  - "tabindex=-1 and onkeydown added to role=dialog panel to satisfy Svelte a11y warnings (Rule 2)"
  - "NostrConnectSigner is recreated (not mutated) when relay changes — NostrConnectSigner has no setRelay API"

patterns-established:
  - "Modal tab components receive onClose as a prop and call it on success — no global store needed"
  - "QR canvas uses inline style for image-rendering: pixelated (not a Tailwind utility)"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04]

duration: 3min
completed: 2026-04-09
---

# Phase 01 Plan 03: Login Modal Components Summary

**Three-file NIP-07/NIP-46 login modal with lean-qr QR canvas (primary purple, pixelated), live relay update, and bunker paste flow**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-09T11:32:21Z
- **Completed:** 2026-04-09T11:34:34Z
- **Tasks:** 2 (plus TDD test commit)
- **Files modified:** 4

## Accomplishments

- LoginModal.svelte modal shell: tab switcher (Extension / Remote Signer), backdrop close, Escape key, role=dialog accessibility
- ExtensionTab.svelte: extension detection via window.nostr, disabled button with tooltip when absent, error classification for "missing", "denied", and generic errors
- RemoteSignerTab.svelte: lean-qr QR canvas with primary purple on transparent, live QR regeneration on relay field oninput, bunker URI paste with loginWithBunker, finishNostrConnectLogin QR approval handler
- Filled qr.test.ts stubs — 2 real unit tests covering URI passthrough to generate() and primary purple RGBA to toCanvas(); all 19 tests green

## Task Commits

1. **Task 1: Build LoginModal shell and ExtensionTab** - `5bbd8db` (feat)
2. **Task 2: QR tests RED phase** - `51c8a7d` (test)
3. **Task 2: Build RemoteSignerTab + a11y fix** - `a6e7ddb` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/components/LoginModal.svelte` - Modal overlay with backdrop, Escape key, tab switcher, aria-modal/role=dialog
- `src/lib/components/LoginModal/ExtensionTab.svelte` - NIP-07 login tab: extension detection, connect button with disabled state, error messages
- `src/lib/components/LoginModal/RemoteSignerTab.svelte` - NIP-46 tab: QR canvas (lean-qr), relay input with live update, bunker paste, connecting spinner
- `src/lib/__tests__/qr.test.ts` - Replaced todo stubs with 2 passing tests for lean-qr integration

## Decisions Made

- NostrConnectSigner is recreated when relay changes (not mutated) — the NostrConnectSigner class has no setRelay API; a new instance is the only correct approach
- Tab components receive onClose as a prop and call it on success — no global store or event bus needed for this simple flow

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added tabindex and onkeydown to role=dialog panel**
- **Found during:** Task 2 verification (pnpm check)
- **Issue:** Svelte a11y warnings: dialog role div needed tabindex for focus management and a keyboard handler for interactive click event
- **Fix:** Added `tabindex="-1"` and `onkeydown={(e) => e.key === 'Escape' && onClose()}` to the modal panel div
- **Files modified:** src/lib/components/LoginModal.svelte
- **Verification:** pnpm check exits 0 with 0 warnings after fix
- **Committed in:** a6e7ddb (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical/a11y)
**Impact on plan:** Required for accessibility correctness. Zero scope creep.

## Issues Encountered

None — lean-qr and applesauce-signers were already installed, test infrastructure was in place from Plan 02.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three login modal components are complete and type-check clean
- LoginModal.svelte is ready to be imported into +page.svelte footer in Plan 04
- AUTH-01 through AUTH-04 requirements are satisfied
- Plan 04 can wire the modal to the footer login link and add owner indicator

---
*Phase: 01-auth*
*Completed: 2026-04-09*
