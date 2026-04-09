# Phase 1: Auth - Research

**Researched:** 2026-04-09
**Domain:** Nostr signing (NIP-07 extension, NIP-46 remote signer), Svelte 5 reactive singleton, localStorage session persistence, QR code generation
**Confidence:** HIGH

## Summary

Phase 1 adds a complete owner login system to a Svelte 5/SvelteKit SPA. The stack is well-defined: `applesauce-signers` (not yet installed) provides `ExtensionSigner` for NIP-07 and `NostrConnectSigner` for NIP-46. Session state lives in localStorage using a typed key pair. A Svelte 5 `.svelte.ts` singleton (`auth.svelte.ts`) holds `$state`/`$derived` reactive variables that drive conditional UI rendering without page reload.

The NIP-46 tab needs a QR code rendered to `<canvas>` from a `nostrconnect://` URI. `lean-qr` (2.7.1, already in the npm registry) is the right tool: zero dependencies, 4.75 kB gzip, pure synchronous computation. The existing project uses no test framework — Wave 0 of planning must stand up `vitest` before writing auth unit tests.

The most dangerous implementation trap is the three-keypair problem in NIP-46: the bunker URI contains the *remote signer's* pubkey, not the user's signing pubkey. Always call `await signer.getPublicKey()` after `fromBunkerURI()` resolves; never assume the bunker URI pubkey is the user's identity.

**Primary recommendation:** Install `applesauce-signers@5.2.0` and `lean-qr@2.7.1`, implement `src/lib/auth.svelte.ts` as the reactive singleton, and wire it into `+page.svelte` to gate owner UI.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Login UX Flow**
- NIP-07 and NIP-46 presented as tabs ("Extension" and "Remote Signer") in a login modal
- If no NIP-07 extension detected, disable the Extension tab button with "No extension detected" tooltip
- Default NIP-46 relay: `wss://bucket.coracle.social`
- Login triggered from a text link "Login" in the footer, next to the GitHub link

**Session Persistence**
- Login state stored in localStorage (persists across tabs and browser restarts)
- For NIP-46: persist bunker URI + relay URL (enough to reconnect without re-scanning QR)
- For NIP-07: persist just a flag (`auth:nip07`) — extension is always available
- Stale/invalid persisted session: silent fallback to logged-out state (clear stored data, show login link)

**Owner Detection & Management UI**
- `isOwner` is a `$derived` flag in the auth singleton, computed from signer pubkey vs parsed hostname pubkey
- Phase 1 shows minimal placeholder: "Logged in as owner" indicator + logout button
- Footer login link becomes "Logout" with a small owner badge after login
- Auth state module uses `signer.svelte.ts` pattern (Svelte 5 `.svelte.ts` for reactive `$state`/`$derived` across modules)

### Claude's Discretion
- Internal component decomposition within the login modal
- Error message wording for connection failures
- Exact styling of the login modal (follow existing Tailwind patterns)

### Deferred Ideas (OUT OF SCOPE)
- Theme picker modal (Phase 2)
- Nsite editing/deletion UI (Phase 3)
- Event publishing infrastructure (`publisher.ts`) — will be needed in Phase 2, not this phase
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can log in via NIP-07 browser extension (window.nostr) | `ExtensionSigner.getPublicKey()` proxies to `window.nostr`; detect with `typeof window.nostr !== 'undefined'` |
| AUTH-02 | User can log in via NIP-46 by pasting a bunker URI | `NostrConnectSigner.fromBunkerURI(uri, opts)` — static async factory; call `await signer.getPublicKey()` after |
| AUTH-03 | User can log in via NIP-46 by scanning a nostrconnect:// QR code | `new NostrConnectSigner({relays, ...}).getNostrConnectURI(config)` generates the `nostrconnect://` URI; `lean-qr generate(uri).toCanvas(el, opts)` renders it |
| AUTH-04 | Relay field updates QR code and bunker URI live on input | `lean-qr` is synchronous — re-run `generate(uri).toCanvas(el)` on every `input` event; no debounce needed |
| AUTH-05 | Logged-in pubkey compared to site npub to detect owner status | `$derived` in `auth.svelte.ts`: `isOwner = signerPubkey === parsedHost.pubkey` |
| AUTH-06 | Login state persists across page refreshes | localStorage: `auth:type` (`nip07`/`nip46`), `auth:bunker_uri`, `auth:relay`; restore on module init in `auth.svelte.ts` |
| AUTH-07 | User can log out | Call `signer.close()` (NostrConnectSigner) or just clear state; wipe localStorage keys; set `signer = null` in singleton |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| applesauce-signers | 5.2.0 | ExtensionSigner (NIP-07) and NostrConnectSigner (NIP-46) | Already in the applesauce ecosystem used by this project; same major version as applesauce-core/relay already installed |
| lean-qr | 2.7.1 | QR code generation and canvas rendering | Zero dependencies, 4.75 kB gzip, pure computation, no network calls — ideal for a browser SPA |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| applesauce-relay | 5.1.0 | RelayPool for NIP-46 relay communication | Pass `pool` as `publishMethod`/`subscriptionMethod` to NostrConnectSigner |
| nostr-tools | 2.23.3 | nip19 for npub encode/decode | Needed for owner pubkey comparison via `parseNpubFromHostname()` already in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| applesauce-signers | nostr-tools NIP-07/NIP-46 primitives directly | Hand-rolling the event loop, timeout handling, and encryption would be ~300 lines vs. importing a maintained class |
| lean-qr | qrcode, qrcode.react, qr-code-styling | All are heavier or React-specific; lean-qr is the right size for this use case |

**Installation:**
```bash
pnpm add applesauce-signers@5.2.0 lean-qr@2.7.1
```

**Version verification:** Confirmed against npm registry on 2026-04-09.
- `applesauce-signers`: latest = 5.2.0 (matches applesauce-core/relay already installed at 5.1.0 — patch-level difference is acceptable; use 5.2.0)
- `lean-qr`: latest = 2.7.1

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── auth.svelte.ts           # Svelte 5 reactive auth singleton (NEW)
│   ├── components/
│   │   ├── LoginModal.svelte        # Modal shell with tab switcher (NEW)
│   │   ├── LoginModal/
│   │   │   ├── ExtensionTab.svelte  # NIP-07 tab content (NEW)
│   │   │   └── RemoteSignerTab.svelte # NIP-46 tab + QR + relay field (NEW)
│   │   └── OwnerBadge.svelte        # Small owner indicator dot (NEW)
│   └── nostr/
│       └── store.ts             # Existing pool singleton (used by NIP-46)
└── routes/
    └── +page.svelte             # Import auth singleton, gate owner UI
```

### Pattern 1: Svelte 5 `.svelte.ts` Reactive Singleton

**What:** A `.svelte.ts` file exports a reactive object using `$state` and `$derived` runes. Any component importing it gets a live reference to the same reactive state — Svelte 5 runes work outside components in `.svelte.ts` files.

**When to use:** Global auth state that multiple components need to read without prop-drilling.

```typescript
// src/lib/auth.svelte.ts
import { ExtensionSigner } from 'applesauce-signers';
import { NostrConnectSigner } from 'applesauce-signers';
import { parseNpubFromHostname } from '$lib/nostr/bootstrap';
import { pool } from '$lib/nostr/store';

const STORAGE_KEY_TYPE = 'auth:type';
const STORAGE_KEY_BUNKER = 'auth:bunker_uri';
const STORAGE_KEY_RELAY = 'auth:relay';

let signer = $state<ExtensionSigner | NostrConnectSigner | null>(null);
let signerPubkey = $state<string | null>(null);

// isOwner derived at the module level — components import this directly
export const isOwner = $derived(
  signerPubkey !== null &&
  signerPubkey === parseNpubFromHostname(window.location.hostname)?.pubkey
);

export function getSignerPubkey() { return signerPubkey; }
export function getSigner() { return signer; }

export async function loginWithExtension() { /* ... */ }
export async function loginWithBunker(uri: string) { /* ... */ }
export function logout() { /* ... */ }

// Restore session on module load (called once at app boot)
export async function restoreSession() { /* ... */ }
```

### Pattern 2: NIP-46 QR Generation (lean-qr)

**What:** `lean-qr` generates a QR code bitmap from a string and renders it synchronously to a `<canvas>` element. Regenerate on every relay field `input` event.

**When to use:** RemoteSignerTab component, whenever relay URL or signer instance changes.

```typescript
// Source: https://qr.davidje13.com/docs/
import { generate } from 'lean-qr';

function renderQr(canvas: HTMLCanvasElement, uri: string) {
  generate(uri).toCanvas(canvas, {
    on: [0x8b, 0x5c, 0xf6, 0xff],  // primary purple rgba — matches --color-primary
    off: [0x00, 0x00, 0x00, 0x00],  // transparent background
    pad: 2,
  });
}
```

CSS on the canvas: `image-rendering: pixelated;` to prevent blur at display size.

### Pattern 3: NostrConnectSigner Initialization

**What:** Two initialization flows for NIP-46 — QR (client generates URI and waits) vs. paste (user provides bunker:// URI).

```typescript
// Source: applesauce-signers@5.2.0 NostrConnectSigner

// QR flow — client generates nostrconnect:// URI, waits for approval
const nostrConnectSigner = new NostrConnectSigner({
  relays: [relayUrl],
  subscriptionMethod: (relays, filters) => pool.req(relays, filters),
  publishMethod: (relays, event) => pool.publish(relays, event),
});
const uri = nostrConnectSigner.getNostrConnectURI({
  name: 'npub-home',
  permissions: NostrConnectSigner.buildSigningPermissions([1, 0]),
});
// Render uri to QR canvas
// await nostrConnectSigner.waitForSigner() — resolves when remote approves
const userPubkey = await nostrConnectSigner.getPublicKey();

// Paste flow — user provides bunker:// URI
const bunkerSigner = await NostrConnectSigner.fromBunkerURI(bunkerUri, {
  subscriptionMethod: (relays, filters) => pool.req(relays, filters),
  publishMethod: (relays, event) => pool.publish(relays, event),
});
// CRITICAL: call getPublicKey() — never use the bunker URI pubkey as user identity
const userPubkey = await bunkerSigner.getPublicKey();
```

### Pattern 4: Session Persistence (localStorage)

**What:** Store minimal data needed to recreate a signer on next load. For NIP-07, just a type flag. For NIP-46, the original bunker URI and relay URL.

```typescript
// Persist after successful login
function persistNip07() {
  localStorage.setItem('auth:type', 'nip07');
}

function persistNip46(bunkerUri: string, relay: string) {
  localStorage.setItem('auth:type', 'nip46');
  localStorage.setItem('auth:bunker_uri', bunkerUri);
  localStorage.setItem('auth:relay', relay);
}

// Restore on module load
async function restoreSession(): Promise<void> {
  const type = localStorage.getItem('auth:type');
  if (!type) return;
  try {
    if (type === 'nip07') {
      // Re-create ExtensionSigner and call getPublicKey to confirm extension still present
    } else if (type === 'nip46') {
      const uri = localStorage.getItem('auth:bunker_uri');
      const relay = localStorage.getItem('auth:relay');
      if (!uri) throw new Error('missing bunker uri');
      // Re-connect via fromBunkerURI
    }
  } catch {
    // Silent fallback: clear storage, stay logged out
    clearPersistedSession();
  }
}

function clearPersistedSession() {
  localStorage.removeItem('auth:type');
  localStorage.removeItem('auth:bunker_uri');
  localStorage.removeItem('auth:relay');
}
```

### Anti-Patterns to Avoid

- **Using bunker URI pubkey as user identity:** The pubkey in `bunker://<pubkey>?relay=...` is the *remote signer's* key, not the user's signing pubkey. Always call `await signer.getPublicKey()` after `fromBunkerURI()`.
- **Calling `parseNpubFromHostname` outside the browser:** This function reads `window.location.hostname`; SSR is disabled (`ssr = false`) in this project so it is safe in module init, but avoid calling it during module import before the browser has loaded.
- **Using `<style>` blocks in Svelte components:** The project convention is no component-scoped styles — use Tailwind utility classes only.
- **Default exports in new modules:** Project convention is named exports only.
- **Storing signer private key in localStorage:** The local ephemeral keypair used by `NostrConnectSigner` for relay communication is generated fresh each session — do not persist it; the bunker URI is sufficient for reconnection.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| NIP-07 extension proxy | Custom `window.nostr` wrapper | `ExtensionSigner` from applesauce-signers | Handles missing extension errors, pubkey caching, event verification |
| NIP-46 event loop | Custom request/response matcher over WebSockets | `NostrConnectSigner` from applesauce-signers | Handles request ID matching, timeouts, auth callbacks, NIP-44 encryption |
| QR code generation | Canvas pixel manipulation | `lean-qr` | QR code error correction encoding is ~300 lines of math; lean-qr is battle-tested and tiny |
| Relay connections for NIP-46 | New RelayPool instance | Existing `pool` singleton from `$lib/nostr/store` | Reuses established connections; avoids duplicate WebSocket connections to the same relays |

**Key insight:** NIP-46 is significantly more complex than it appears — it involves two encrypted communication channels (NIP-04 for compatibility, NIP-44 optionally), a three-way handshake, and async request/response matching with timeouts. `applesauce-signers` encapsulates all of this.

---

## Common Pitfalls

### Pitfall 1: NIP-46 Three-Keypair Confusion
**What goes wrong:** Developer uses the pubkey from the bunker URI as the user's pubkey for `isOwner` comparison.
**Why it happens:** `bunker://<pubkey>?relay=...` looks like it contains the user's key, but it's the *remote signer's* public key (the bunker's identity), not the user's signing key.
**How to avoid:** After any NIP-46 connect flow, always call `await signer.getPublicKey()` to get the actual user pubkey. This is the value to compare against `parsedHost.pubkey`.
**Warning signs:** `isOwner` is always `false` for NIP-46 logins even with the correct signer.

### Pitfall 2: Stale Session Reconnection Failure
**What goes wrong:** App crashes or shows a broken state on load when localStorage has a NIP-46 session but the bunker is unreachable.
**Why it happens:** `fromBunkerURI()` is async and can throw; if the error is not caught, the singleton remains in a half-initialized state.
**How to avoid:** Wrap `restoreSession()` in try/catch; on any error, call `clearPersistedSession()` and silently stay logged out. Log the error to console for debugging.
**Warning signs:** Page freezes on load, or `signerPubkey` is set but `signer` is null.

### Pitfall 3: `$derived` Called Before `parseNpubFromHostname` Is Available
**What goes wrong:** `isOwner` derived value throws during SSR or server-side module evaluation.
**Why it happens:** `window.location` does not exist in Node.js/SSR context.
**How to avoid:** This project has `ssr = false` and `prerender = false` in `+layout.ts`, so this is not a risk at runtime. However, if the `isOwner` derived logic calls `parseNpubFromHostname` directly, guard with `typeof window !== 'undefined'`.
**Warning signs:** Type-check errors or runtime errors during `vite build`.

### Pitfall 4: QR Code Not Updating After Relay Field Edit
**What goes wrong:** QR code shows stale URI after user edits the relay field.
**Why it happens:** The canvas is rendered once on mount; the `input` event handler is not wired up or the `nostrconnect://` URI is only generated once at component initialization.
**How to avoid:** The QR URI depends on two values: the signer's local pubkey/secret (stable after construction) and the relay URL (user-editable). When relay changes, construct a new `NostrConnectSigner` with the new relay OR use `signer.switchRelays()` if available, then call `getNostrConnectURI()` and re-render the canvas.
**Warning signs:** Relay field updates do not refresh the QR code.

### Pitfall 5: `applesauce-signers` Version Mismatch
**What goes wrong:** Type errors or runtime failures when `NostrConnectSigner` is passed to `pool.req()` or `.publish()`.
**Why it happens:** `applesauce-signers` 5.2.0 should be compatible with `applesauce-relay` 5.1.0 (same major). If installed at a different version, the `ISigner` interface may not align.
**How to avoid:** Pin `applesauce-signers@5.2.0` in `package.json` during `pnpm add`.
**Warning signs:** TypeScript errors on `signer.signEvent` or relay pool subscription methods.

---

## Code Examples

### ExtensionSigner — NIP-07 Login
```typescript
// Source: applesauce-signers ExtensionSigner source (verified 2026-04-09)
import { ExtensionSigner, ExtensionMissingError } from 'applesauce-signers';

const nip07Signer = new ExtensionSigner();
// detect presence: typeof window.nostr !== 'undefined'
// getPublicKey() throws ExtensionMissingError if window.nostr absent
const pubkey = await nip07Signer.getPublicKey();
```

### NostrConnectSigner — QR flow
```typescript
// Source: applesauce-signers NostrConnectSigner (verified 2026-04-09)
import { NostrConnectSigner } from 'applesauce-signers';
import { pool } from '$lib/nostr/store';

const signer = new NostrConnectSigner({
  relays: ['wss://bucket.coracle.social'],
  subscriptionMethod: (relays, filters) => pool.req(relays, filters),
  publishMethod: (relays, event) => pool.publish(relays, event),
});
const uri = signer.getNostrConnectURI({ name: 'npub-home' });
// render uri to QR canvas
const pubkey = await signer.getPublicKey(); // waits for remote approval
```

### NostrConnectSigner — Bunker paste flow
```typescript
// Source: applesauce-signers NostrConnectSigner.fromBunkerURI (verified 2026-04-09)
const signer = await NostrConnectSigner.fromBunkerURI(bunkerUri, {
  subscriptionMethod: (relays, filters) => pool.req(relays, filters),
  publishMethod: (relays, event) => pool.publish(relays, event),
});
const pubkey = await signer.getPublicKey(); // NEVER use bunker URI pubkey
```

### lean-qr — Canvas rendering
```typescript
// Source: https://qr.davidje13.com/docs/ (verified 2026-04-09)
import { generate } from 'lean-qr';

function renderQr(canvas: HTMLCanvasElement, text: string) {
  generate(text).toCanvas(canvas, {
    on: [0x8b, 0x5c, 0xf6, 0xff],  // RGBA matching --primary: 258 70% 60%
    off: [0x00, 0x00, 0x00, 0x00],  // transparent
    pad: 2,
  });
}
// Canvas CSS: style="image-rendering: pixelated; width: 200px; height: 200px;"
```

### Owner detection in auth.svelte.ts
```typescript
// Svelte 5 runes in .svelte.ts — reactive across all importers
let signerPubkey = $state<string | null>(null);

export const isOwner = $derived(
  signerPubkey !== null &&
  typeof window !== 'undefined' &&
  signerPubkey === parseNpubFromHostname(window.location.hostname)?.pubkey
);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Svelte 4 `writable` stores for cross-module state | Svelte 5 `$state`/`$derived` in `.svelte.ts` files | Svelte 5 (this project already uses it) | Simpler, no store subscription boilerplate |
| `wss://nsec.app` as default NIP-46 relay | `wss://bucket.coracle.social` | nsec.app gone as of 2025 | Default relay in CONTEXT.md already updated |
| NIP-04 encryption for NIP-46 | NIP-44 preferred, NIP-04 for compatibility | NIP-46 spec update | `NostrConnectSigner` handles both transparently |

**Deprecated/outdated:**
- `nsec.app` relay: shut down — replaced by `wss://bucket.coracle.social` (already in CONTEXT.md decisions)
- Svelte 4 `$:` reactive declarations: do not use — project is Svelte 5 runes only

---

## Open Questions

1. **NostrConnectSigner relay relay-field live update mechanism**
   - What we know: `NostrConnectSigner` has a `switchRelays()` method per the source; the constructor also accepts `relays`
   - What's unclear: Whether `switchRelays()` regenerates the `nostrconnect://` URI automatically or requires calling `getNostrConnectURI()` again
   - Recommendation: During implementation, inspect whether it is simpler to reconstruct a new `NostrConnectSigner` instance when the relay changes (before the user pastes a bunker URI) vs. calling `switchRelays()`. Since no connection is established yet during QR display, re-construction is the safest approach.

2. **`pool.publish` return type compatibility**
   - What we know: `NostrConnectSigner` options accept `publishMethod: (relays, event) => ...`
   - What's unclear: Exact return type `applesauce-relay`'s `pool.publish` returns vs what `applesauce-signers` 5.2.0 expects
   - Recommendation: Check TypeScript signatures during implementation; may need a wrapper arrow function to adapt types.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build | ✓ | 22.22.1 | — |
| pnpm | Package install | ✓ | (lockfile v9) | — |
| applesauce-signers | NIP-07 + NIP-46 signing | ✗ (not installed) | — | None — must install |
| lean-qr | QR code for NIP-46 | ✗ (not installed) | — | None — must install |
| applesauce-relay | NIP-46 relay comms | ✓ | 5.1.0 | — |
| applesauce-core | EventStore | ✓ | 5.1.0 | — |
| nostr-tools | nip19 encode/decode | ✓ | 2.23.3 | — |

**Missing dependencies with no fallback:**
- `applesauce-signers@5.2.0` — blocks all auth implementation; must be installed in Wave 0
- `lean-qr@2.7.1` — blocks NIP-46 QR code display; must be installed in Wave 0

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — must set up vitest in Wave 0 |
| Config file | `vitest.config.ts` — does not exist yet |
| Quick run command | `pnpm vitest run --reporter=verbose` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | ExtensionSigner calls window.nostr.getPublicKey | unit | `pnpm vitest run src/lib/auth.svelte.test.ts -t "nip07"` | ❌ Wave 0 |
| AUTH-02 | fromBunkerURI sets signerPubkey from getPublicKey result | unit (mock) | `pnpm vitest run src/lib/auth.svelte.test.ts -t "nip46 bunker"` | ❌ Wave 0 |
| AUTH-03 | getNostrConnectURI returns nostrconnect:// URI | unit | `pnpm vitest run src/lib/auth.svelte.test.ts -t "nostrconnect uri"` | ❌ Wave 0 |
| AUTH-04 | lean-qr re-renders canvas on relay change | unit (jsdom) | `pnpm vitest run src/lib/components/LoginModal -t "qr relay"` | ❌ Wave 0 |
| AUTH-05 | isOwner is true when pubkeys match | unit | `pnpm vitest run src/lib/auth.svelte.test.ts -t "isOwner"` | ❌ Wave 0 |
| AUTH-06 | restoreSession reads localStorage and rebuilds signer | unit (mock storage) | `pnpm vitest run src/lib/auth.svelte.test.ts -t "persist"` | ❌ Wave 0 |
| AUTH-07 | logout clears signer state and localStorage | unit | `pnpm vitest run src/lib/auth.svelte.test.ts -t "logout"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run src/lib/auth.svelte.test.ts`
- **Per wave merge:** `pnpm vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — vitest not installed; run `pnpm add -D vitest @vitest/coverage-v8 jsdom @testing-library/svelte`
- [ ] `src/lib/auth.svelte.test.ts` — covers AUTH-01 through AUTH-07
- [ ] `src/lib/components/LoginModal/RemoteSignerTab.test.ts` — covers AUTH-03, AUTH-04 (lean-qr canvas rendering)

---

## Project Constraints (from CLAUDE.md)

| Directive | Category | Impact on Auth Phase |
|-----------|----------|---------------------|
| Each feature on a separate branch, published as PR | Branching | Auth phase must be on its own branch before merging |
| Component isolation: theme picker must be extractable | Architecture | Auth singleton and modal must not import theme code |
| All write operations use logged-in signer | Signing | Phase 1 establishes the signer — Phase 2+ consume it |
| No backend; all data through Nostr relays | Infrastructure | NIP-46 relay comms via existing `pool` singleton |
| Use `pnpm`, not `npm` or `npx` | Package manager | `pnpm add applesauce-signers lean-qr` |
| do not use `--break-system-packages` | System | Not applicable (Node.js packages, not Python) |

---

## Sources

### Primary (HIGH confidence)
- applesauce-signers npm registry (5.2.0 confirmed 2026-04-09) — version, exports, package structure
- GitHub hzrd149/applesauce signers/src/signers/extension-signer.ts — ExtensionSigner full source (verified)
- GitHub hzrd149/applesauce signers/src/signers/nostr-connect-signer.ts — NostrConnectSigner constructor, fromBunkerURI, getNostrConnectURI (verified)
- https://qr.davidje13.com/docs/ — lean-qr generate(), toCanvas(), color options (verified)
- lean-qr npm registry (2.7.1 confirmed 2026-04-09) — version, zero dependencies
- Project source: src/lib/nostr/store.ts, src/lib/nostr/bootstrap.ts, src/routes/+page.svelte, src/app.css — existing patterns, CSS tokens, integration points

### Secondary (MEDIUM confidence)
- NIP-46 spec (nips.nostr.com/46) — three-keypair architecture confirmation, bunker:// URI format
- applesauce.build TypeDoc module listing — confirms ExtensionSigner and NostrConnectSigner exported at package root

### Tertiary (LOW confidence)
- WebSearch results for lean-qr SVG/canvas API — corroborated by official docs; LOW for SVG-specific API surface (not used in this phase)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package versions confirmed from npm registry
- Architecture: HIGH — based on existing project patterns + verified library source
- Pitfalls: HIGH for NIP-46 three-keypair trap (confirmed in STATE.md and library source); MEDIUM for relay update mechanism (open question)
- Test infrastructure: HIGH — no tests exist; confirmed by codebase scan

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (applesauce-signers releases frequently; re-verify version before planning if more than 2 weeks pass)
