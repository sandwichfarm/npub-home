---
phase: 01-auth
verified: 2026-04-09T13:41:00Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: "NIP-07 extension login end-to-end"
    expected: "Clicking Login -> Extension tab -> Connect Extension connects via browser extension, modal closes, OwnerBadge appears above ProfileCard, footer shows Logout + purple dot"
    why_human: "Requires a running Nostr browser extension (Alby/nos2x) in a real browser"
  - test: "NIP-46 bunker URI login end-to-end"
    expected: "Clicking Login -> Remote Signer tab -> pasting bunker:// URI -> Connect triggers login, modal closes, OwnerBadge appears"
    why_human: "Requires a running NIP-46 remote signer"
  - test: "NIP-46 QR code visible and relay update live"
    expected: "QR code renders in purple on transparent background; editing relay field regenerates QR immediately"
    why_human: "QR rendering is visual and canvas-based; requires real browser rendering to confirm"
  - test: "Owner detection: non-owner pubkey sees no owner UI"
    expected: "When logged in with a pubkey that does not match the site hostname npub, OwnerBadge and Logout badge are absent"
    why_human: "Requires testing with a signer whose pubkey does not match the deployed site domain"
  - test: "Session persistence across page reload"
    expected: "After NIP-07 login, refreshing the page shows OwnerBadge and Logout without re-login"
    why_human: "Requires browser state and real extension interaction; cannot be tested headlessly"
  - test: "Human checkpoint in Plan 04 was auto-approved, not human-reviewed"
    expected: "A human confirms the full end-to-end flow described in 01-04-PLAN.md Task 2 works in a browser"
    why_human: "The 01-04 SUMMARY records 'checkpoint auto-approved (auto_advance: true)' — no human actually performed the browser verification steps"
---

# Phase 1: Auth Verification Report

**Phase Goal:** The site owner can log in, be recognized as owner, and stay logged in across reloads
**Verified:** 2026-04-09T13:41:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Owner can click a footer Login link and log in via NIP-07 extension in one click | ? HUMAN | Login button exists in footer (line 132 +page.svelte); ExtensionTab wired to loginWithExtension(); requires browser + extension to confirm |
| 2 | Owner can log in via NIP-46 by pasting bunker URI or scanning QR, with live relay update | ? HUMAN | RemoteSignerTab exists with bunker input, QR canvas, relay field + oninput handler; requires real signer to confirm end-to-end |
| 3 | After login, page shows owner-only management UI without reloading; visitors see none | ? HUMAN | isOwner() gates OwnerBadge and footer Logout reactively; automated checks confirm code path; requires browser to confirm reactivity works |
| 4 | Refreshing the page after login keeps the owner logged in (session survives reload) | ? HUMAN | restoreSession() called in onMount before Nostr hydration (line 28 +page.svelte); localStorage keys persisted; requires browser reload test |
| 5 | Owner can log out and management UI disappears | ? HUMAN | logout() called from OwnerBadge "Log out" button and footer Logout button; clears state and localStorage; confirmed by 4 passing unit tests; requires browser to confirm UI update |

**Score:** 5/5 truths have complete implementation; all are verified at code level but require human confirmation for UI/browser behavior.

### Required Artifacts

| Artifact | Expected | Lines | Status | Details |
|----------|----------|-------|--------|---------|
| `src/lib/auth.svelte.ts` | Reactive auth singleton with all exports | 183 | VERIFIED | All 9 required exports present; $state/$derived Svelte 5 runes; localStorage persistence |
| `src/lib/__tests__/auth.test.ts` | Passing unit tests AUTH-01, -02, -06, -07 | 200 | VERIFIED | 17 tests, all passing; no it.todo remaining |
| `vitest.config.ts` | Vitest config for Svelte 5 + jsdom | 18 | VERIFIED | svelteTesting via plugin, $lib alias, include glob present |
| `src/lib/__tests__/qr.test.ts` | QR canvas rendering tests | 30 | VERIFIED | 2 tests passing; mocks lean-qr correctly |
| `src/lib/components/LoginModal.svelte` | Modal shell with tabs, backdrop, Escape handler | 70 | VERIFIED | role=dialog, aria-modal, aria-selected, Escape key handler |
| `src/lib/components/LoginModal/ExtensionTab.svelte` | NIP-07 login tab | 55 | VERIFIED | loginWithExtension wired, disabled state, error display |
| `src/lib/components/LoginModal/RemoteSignerTab.svelte` | NIP-46 tab with QR and bunker paste | 150 | VERIFIED | lean-qr imported, createNostrConnectSigner wired, handleRelayInput, image-rendering:pixelated |
| `src/lib/components/OwnerBadge.svelte` | Owner indicator bar with logout | 11 | VERIFIED | logout() wired, "Logged in as owner" text present |
| `src/routes/+page.svelte` | Page wired with restoreSession, LoginModal, OwnerBadge, footer | 138 | VERIFIED | All 5 grep checks pass; restoreSession called in onMount |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/auth.svelte.ts` | `applesauce-signers` | `import { ExtensionSigner, NostrConnectSigner }` | WIRED | Line 1 of auth.svelte.ts |
| `src/lib/auth.svelte.ts` | `src/lib/nostr/bootstrap.ts` | `parseNpubFromHostname` | WIRED | Line 2; used in `_isOwner` $derived |
| `src/lib/auth.svelte.ts` | `src/lib/nostr/store.ts` | `pool` import | WIRED | Line 3; used in poolMethods() for NIP-46 |
| `src/lib/auth.svelte.ts` | `localStorage` | `localStorage.setItem('auth:type', ...)` | WIRED | Lines 49, 53; removeItem on logout lines 59-61 |
| `ExtensionTab.svelte` | `auth.svelte.ts` | `import { loginWithExtension }` | WIRED | Line 2; called in handleConnect() |
| `RemoteSignerTab.svelte` | `auth.svelte.ts` | `import { createNostrConnectSigner, loginWithBunker, finishNostrConnectLogin }` | WIRED | Line 4; all three used in component logic |
| `RemoteSignerTab.svelte` | `lean-qr` | `import { generate } from 'lean-qr'` | WIRED | Line 3; called in renderQr() with correct options |
| `+page.svelte` | `auth.svelte.ts` | `import { restoreSession, logout, isOwner }` | WIRED | Line 11; restoreSession() called line 28; isOwner() used lines 109, 117; logout wired line 122 |
| `+page.svelte` | `LoginModal.svelte` | `{#if showLoginModal}<LoginModal .../>` | WIRED | Lines 12, 102-104 |
| `+page.svelte` | `OwnerBadge.svelte` | `{#if isOwner()}<OwnerBadge />` | WIRED | Lines 13, 109-111 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `+page.svelte` — OwnerBadge gate | `isOwner()` | `_isOwner = $derived(signerPubkey !== null && signerPubkey === parseNpubFromHostname(hostname)?.pubkey)` | Yes — compares live reactive state to hostname-parsed pubkey | FLOWING |
| `+page.svelte` — footer Login/Logout | `isOwner()` | Same derived as above | Yes | FLOWING |
| `OwnerBadge.svelte` — logout button | `logout` function from auth singleton | Calls `signer.close()`, nulls state, clears localStorage | Yes | FLOWING |
| `RemoteSignerTab.svelte` — QR canvas | `nostrConnectUri` | `createNostrConnectSigner(relay).getNostrConnectURI({name:'npub-home'})` | Yes — real NIP-46 URI from signer | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| vitest exits 0 | `pnpm vitest run` | 19 passed (2 files) | PASS |
| pnpm check exits clean | `pnpm check` | 0 errors, 0 warnings | PASS |
| pnpm build exits 0 | `pnpm build` | Built in 3.07s, dist written | PASS |
| auth.svelte.ts exports all required symbols | `grep -n "^export"` | 9 exports found (isOwner, getSigner, getSignerPubkey, loginWithExtension, loginWithBunker, createNostrConnectSigner, finishNostrConnectLogin, restoreSession, logout) | PASS |
| localStorage setItem with auth:type present | grep pattern | 2 matches (nip07 and nip46 persist paths) | PASS |
| restoreSession called in onMount before Nostr hydration | grep | Line 28 +page.svelte — called before subscribe() | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTH-01 | 01-02, 01-03 | User can log in via NIP-07 browser extension | SATISFIED (code) / ? HUMAN (UX) | `loginWithExtension()` in auth.svelte.ts; ExtensionTab wired; 3 unit tests passing |
| AUTH-02 | 01-02, 01-03 | User can log in via NIP-46 bunker URI | SATISFIED (code) / ? HUMAN (UX) | `loginWithBunker()` implemented; RemoteSignerTab bunker paste wired; 4 unit tests passing |
| AUTH-03 | 01-03 | User can log in via NIP-46 QR code scan | SATISFIED (code) / ? HUMAN (UX) | `createNostrConnectSigner()` + `finishNostrConnectLogin()`; canvas QR rendering with lean-qr; 2 QR tests passing |
| AUTH-04 | 01-03 | User can modify relay; updates QR and URI live | SATISFIED (code) / ? HUMAN (visual) | `handleRelayInput()` calls `buildQrSigner()` on every input event, no debounce; relay field bound with `oninput` |
| AUTH-05 | 01-02, 01-04 | Logged-in pubkey compared to site npub for owner status | SATISFIED (code) / ? HUMAN (UX) | `_isOwner = $derived(signerPubkey === parseNpubFromHostname(hostname)?.pubkey)`; isOwner() gating OwnerBadge and footer |
| AUTH-06 | 01-02, 01-04 | Login state persists across page refreshes | SATISFIED (code) / ? HUMAN (browser) | localStorage persistence in loginWithExtension/loginWithBunker; restoreSession() called in onMount; 5 unit tests passing |
| AUTH-07 | 01-02, 01-04 | User can log out | SATISFIED (code) / ? HUMAN (UX) | logout() clears state and localStorage; wired to OwnerBadge "Log out" and footer Logout; 4 unit tests passing |

All 7 requirements are claimed by plans and implemented in code. All are satisfied at the code/unit-test level. All require human browser verification to confirm UX behaviors.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/auth.svelte.ts` | 32 | `// TODO: verify type compat with applesauce-signers NostrSubscriptionMethod` | Info | TypeScript structural check suppressed with `as any` cast; functionally correct at runtime per comment; does not affect behavior |

The `placeholder` matches in RemoteSignerTab.svelte (lines 104, 133) are HTML `placeholder` attributes on input elements — not stub code patterns. Not flagged.

The `auto_advance: true` checkpoint in Plan 04 means the end-to-end human verification step was skipped. This is the primary reason for `human_needed` status — the code is fully implemented and all automated checks pass, but a human has not confirmed the browser flows.

### Human Verification Required

#### 1. Full End-to-End Auth Flow (covers AUTH-01 through AUTH-07)

**Test:** Run `pnpm dev` from `/home/sandwich/Develop/npub-home`. Open the dev server URL in a browser deployed to an npub hostname (or test via localhost if the parseNpubFromHostname logic accepts it).

**Expected sequence:**
1. Page loads with footer showing "Login" text link only — no OwnerBadge visible
2. Clicking "Login" opens the LoginModal with "Extension" and "Remote Signer" tabs
3. Pressing Escape or clicking backdrop closes the modal
4. If Alby/nos2x is installed: "Connect Extension" button is enabled; clicking prompts extension; after approval modal closes, OwnerBadge ("Logged in as owner" + "Log out") appears above ProfileCard, footer switches to "Logout" + small purple dot
5. If no extension: "Connect Extension" is disabled with "No extension detected" tooltip/message
6. "Remote Signer" tab shows a purple QR code; editing relay field immediately updates QR (no lag)
7. Refreshing after login keeps OwnerBadge visible without re-login prompt
8. Clicking "Log out" (OwnerBadge) or "Logout" (footer) removes OwnerBadge, footer shows "Login" again
9. Refreshing after logout shows "Login" (session cleared)

**Why human:** NIP-07 requires real browser extension; QR rendering is visual (canvas); session persistence requires actual page refresh; owner detection requires hostname matching.

#### 2. Non-owner Login Shows No Owner UI (AUTH-05 negative case)

**Test:** Log in with a signer whose pubkey does not match the site hostname's npub.

**Expected:** OwnerBadge does not appear; footer continues to show "Login" (not "Logout" + dot); page body shows no management UI.

**Why human:** Requires testing with two different signers against a deployed nsite domain.

### Gaps Summary

No functional gaps found. All artifacts are present, substantive, and fully wired. Unit tests (19/19) pass, TypeScript check is clean (0 errors), and production build succeeds.

The `human_needed` status reflects that Plan 04's human verification checkpoint was auto-approved rather than performed by a human. This does not indicate missing implementation — it indicates the browser smoke test has not been signed off.

---

_Verified: 2026-04-09T13:41:00Z_
_Verifier: Claude (gsd-verifier)_
