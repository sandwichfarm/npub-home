# Stack Research

**Domain:** Nostr SPA — login, signing, and site management features
**Researched:** 2026-04-09
**Confidence:** HIGH (core decisions verified via npm registry + source inspection; LOW only where noted)

---

## Existing Stack (Keep As-Is)

The project already has the correct base. Do not swap, add, or upgrade these without a clear need:

| Package | Version | Role |
|---------|---------|------|
| `applesauce-core` | 5.1.0 | EventStore, EventFactory, EventSigner interface |
| `applesauce-relay` | 5.1.0 | RelayPool for subscribing and publishing |
| `nostr-tools` | 2.23.3 | NIP-07 type definitions (`WindowNostr`), NIP-19 encoding |
| `rxjs` | 7.8.2 | Reactive relay subscriptions |
| SvelteKit + Svelte 5 | 2.50.2 / 5.51.0 | App framework with runes |
| Tailwind CSS | 4.2.1 | Styling |

---

## New Dependencies Required

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `applesauce-signers` | 5.2.0 | NIP-07 ExtensionSigner and NIP-46 NostrConnectSigner | Part of the applesauce ecosystem already in use. Provides `ExtensionSigner` (wraps `window.nostr`) and `NostrConnectSigner` (implements full NIP-46 client protocol including `getNostrConnectURI()` and `fromBunkerURI()`). Version 5.2.0 requires `applesauce-core ^5.2.0` — a minor patch bump from the current 5.1.0. |
| `lean-qr` | 2.7.1 | QR code generation for nostrconnect:// URIs | Framework-agnostic, zero dependencies, 4.75 kB gzipped. Outputs to canvas or SVG. Simpler than Svelte-specific wrappers which have unclear Svelte 5 runes compatibility. `qrcode-generator` is already in the bundle (via `@nsite/stealthis`), but it has no TypeScript types and a worse API. `lean-qr` is the cleanest choice for a new component. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `bits-ui` | 2.17.3 | Accessible dialog/modal primitives for Svelte 5 | Use for the theme picker modal and login modal. Provides ARIA-compliant `Dialog`, `Popover`, and similar components built specifically for Svelte 5. No runtime CSS — pairs directly with Tailwind. Only add this if the project does not already have an accessible modal solution. |

---

## EventFactory — Already in applesauce-core v5

**Do NOT add `applesauce-factory` (the separate npm package).** It is at v4.0.0 (latest) and depends on `applesauce-core ^4.0.0`, which conflicts with the project's `applesauce-core ^5.1.0`.

`applesauce-core` v5 ships `EventFactory` directly at `applesauce-core/event-factory`. The full API is available now:

- `EventFactory.build(template, ...operations)` — constructs an `EventTemplate`
- `EventFactory.sign(draft)` — signs with the currently set signer
- `EventFactory.setSigner(signer)` — accepts any `EventSigner` (including `ExtensionSigner` or `NostrConnectSigner`)
- `EventFactory.create(blueprint, ...args)` — creates from a blueprint function
- The `blueprint()` helper from `applesauce-core/event-factory` creates ad-hoc blueprints

NIP-09 deletion events are built manually as `{ kind: 5, tags: [["e", "<event-id>"], ["k", "<kind-number>"]], content: "" }` and signed via the factory — no extra library needed.

---

## Event Publishing — Already in applesauce-relay

`RelayPool.publish(relays, event)` is already available and returns `Promise<{ from: string, ok: boolean }[]>`. The existing `pool` singleton in `src/lib/nostr/store.ts` can be used directly for write operations. No new package needed.

---

## Installation

```bash
# Upgrade applesauce-core and applesauce-relay to 5.2.0 (required by applesauce-signers 5.2.0)
pnpm add applesauce-core@^5.2.0 applesauce-relay@^5.2.0

# Add new packages
pnpm add applesauce-signers@^5.2.0 lean-qr@^2.7.1

# Add bits-ui only if adding a modal/dialog component
pnpm add bits-ui@^2.17.3
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `applesauce-signers` | `nostr-signer-connector` (jiftechnify) | If not using applesauce at all. Since the project is already built on applesauce, stay in-ecosystem. |
| `applesauce-signers` | `@nostr-dev-kit/ndk` signers | NDK signers work, but NDK is a large framework (it would be a second major Nostr framework alongside applesauce). Not appropriate here. |
| `lean-qr` | `qrcode-generator` (already bundled) | If bundle size is critical and you want zero new bytes. `qrcode-generator` has no TypeScript types and a callback-heavy API. Acceptable if the theme-picker is extracted later and bundle size is measured. |
| `lean-qr` | `@castlenine/svelte-qrcode` | If you want a drop-in `<QRCode>` Svelte component. The package's peerDep is `svelte >= 3.54.0` and its internal implementation uses Svelte 4 patterns — untested with Svelte 5 runes. Avoid for now. |
| Native `<dialog>` element | `bits-ui` Dialog | Use native `<dialog>` if the team wants no additional UI dependency and is comfortable with CSS-only animation. `bits-ui` is worth adding only if multiple components are needed. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `applesauce-factory` (separate npm package) | v4.0.0 latest, requires `applesauce-core ^4.0.0` — conflicts with the project's `applesauce-core ^5.1.0`. EventFactory is already in `applesauce-core` v5. | `EventFactory` from `applesauce-core/event-factory` |
| `@nostr-dev-kit/ndk` | Pulls in a second full Nostr framework (~70 kB+). The project is already applesauce-based. Mixing frameworks creates dual relay pools, dual event stores, and unpredictable behavior. | Extend applesauce-signers for signing needs |
| `nostr-tools` NIP-46 module (`nip46.js`) | `nostr-tools` ships a `nip46.js` module, but it is a lower-level implementation that requires manual relay wiring. `NostrConnectSigner` from `applesauce-signers` wraps this cleanly with an RxJS-based subscription model matching the existing relay pattern. | `NostrConnectSigner` from `applesauce-signers` |
| `svelte-qrcode` (original, v1.0.1) | Last published 3+ years ago, Svelte 4 only, abandoned. | `lean-qr` |
| `@trasherdk/svelte-qrcode` | Fork of abandoned original, last updated 1+ year ago, unclear Svelte 5 status. | `lean-qr` |
| `qrcode` (soldair/node-qrcode) | Node.js-oriented, large, brings in a canvas polyfill that conflicts with SSR-disabled SPAs. | `lean-qr` |

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `applesauce-signers@5.2.0` | `applesauce-core@^5.2.0` | Requires bumping from 5.1.0 → 5.2.0. Patch release, no breaking changes expected. |
| `applesauce-signers@5.2.0` | `rxjs@^7.8.2` | Already satisfied by the project's rxjs 7.8.2 |
| `bits-ui@2.17.3` | `svelte@^5.0.0` | Built specifically for Svelte 5 runes. Will not work with Svelte 4. |
| `lean-qr@2.7.1` | Framework-agnostic | No peer deps. Works in any browser environment. |
| `nostr-tools@2.23.3` | `applesauce-signers@5.2.0` | No direct peer dep relationship. Compatible in practice. |

---

## Architecture Notes for Implementation

**Signer lifecycle:** Create a `$state<EventSigner | null>` singleton in a Svelte store or `.svelte.ts` module. `ExtensionSigner` is stateless (calls `window.nostr` on each operation). `NostrConnectSigner` is stateful and must be connected/disconnected. Expose `loggedInPubkey` as a `$derived` that calls `signer.getPublicKey()`.

**NostrConnectSigner wiring:** The `NostrConnectSigner` requires a `subscriptionMethod` (returns Observable) and `publishMethod` (sends EVENT). These should delegate to the existing `RelayPool` instance, keeping one relay pool for both read and write operations.

**NIP-46 connection flows:**
- Bunker URI flow: Call `NostrConnectSigner.fromBunkerURI(uri, { subscriptionMethod, publishMethod })` — user pastes a `bunker://...` string
- nostrconnect:// QR flow: Construct `new NostrConnectSigner({ subscriptionMethod, publishMethod })` first, then call `signer.getNostrConnectURI({ name: "npub-home", ... })` to get the URI for the QR code. The signer waits for the remote signer to respond.

**QR code rendering:** `lean-qr` renders to a `<canvas>` element: `generate(uri).toCanvas(canvasElement)`. Wrap in a Svelte component with `$effect` that calls this when the URI is available.

**Event creation workflow:**
```
EventFactory (from applesauce-core/event-factory)
  → setSigner(extensionSigner | nostrConnectSigner)
  → build({ kind: 16767, tags: [...], content: "" })  // theme
  → sign(draft)  // returns NostrEvent
  → RelayPool.publish(userRelays, signedEvent)
```

NIP-09 deletion: `build({ kind: 5, tags: [["e", eventId], ["k", "35128"]], content: "" })` then sign + publish.

---

## Sources

- `applesauce-core/dist/event-factory/event-factory.d.ts` — source-inspected. Confirms `EventFactory` is in `applesauce-core` v5, not the separate `applesauce-factory` package. HIGH confidence.
- `applesauce-core/dist/event-factory/types.d.ts` — source-inspected. Confirms `EventSigner` interface is compatible with both `ExtensionSigner` and `NostrConnectSigner`. HIGH confidence.
- `applesauce-relay` README — source-inspected. Confirms `pool.publish(relays, event)` API. HIGH confidence.
- `npm info applesauce-signers@5.2.0` — confirmed version, deps, and registry presence. HIGH confidence.
- `npm info applesauce-factory dist-tags` — confirmed v4.0.0 is latest, v4.3.0 is next. No v5 exists. HIGH confidence.
- [applesauce-signers docs](https://applesauce.build/typedoc/modules/applesauce-signers.html) — confirmed ExtensionSigner, NostrConnectSigner, NostrConnectProvider exports. MEDIUM confidence (redirected, content verified).
- [applesauce-signers README on GitHub](https://github.com/hzrd149/applesauce/blob/master/packages/signers/README.md) — confirmed `NostrConnectSigner` API including `getNostrConnectURI()` and `fromBunkerURI()`. MEDIUM confidence.
- [lean-qr docs](https://qr.davidje13.com/docs/) — confirmed `generate(uri).toCanvas(el)` API, 4.75 kB gzipped, no dependencies. HIGH confidence.
- `npm info lean-qr version` → 2.7.1. HIGH confidence.
- `npm info bits-ui version` → 2.17.3. HIGH confidence. Svelte 5 runes support confirmed via official docs and Svelte 5 peer dep requirement.
- `@nsite/stealthis` package.json — confirmed `qrcode-generator` is already a transitive dep. HIGH confidence.
- `nostr-tools/lib/types/nip07.d.ts` — source-inspected. Confirms `WindowNostr` type interface matches `ExtensionSigner` wrapper. HIGH confidence.

---
*Stack research for: npub-home NIP-07/NIP-46 login + Nostr event publishing features*
*Researched: 2026-04-09*
