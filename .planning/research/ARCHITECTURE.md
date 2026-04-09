# Architecture Research

**Domain:** Nostr nsite management SPA (Svelte 5 + applesauce-core/relay)
**Researched:** 2026-04-09
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                            │
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ ProfileCard│  │ NsiteList  │  │ThemePicker │  │ LoginModal   │  │
│  │ (existing) │  │ (existing) │  │ (NEW/iso'd)│  │   (NEW)      │  │
│  └────────────┘  └────────────┘  └─────┬──────┘  └──────┬───────┘  │
│                                        │                │          │
│  ┌─────────────────────────────────────┴────────────────┘          │
│  │             +page.svelte (Orchestrator)                          │
│  └─────────────────────────────────────┬────────────────────────── │
├────────────────────────────────────────┼────────────────────────── ┤
│                Auth Layer              │                            │
│                                        │                            │
│  ┌────────────────────────────────┐    │                            │
│  │       signer.svelte.ts         │◄───┘                            │
│  │  $state: ISigner | null        │                                 │
│  │  $state: loggedInPubkey        │                                 │
│  │  $derived: isOwner             │                                 │
│  │  login(method), logout()       │                                 │
│  └────────────────┬───────────────┘                                 │
├────────────────────┼──────────────────────────────────────────────  ┤
│                Nostr Data Layer        │                            │
│                                        │                            │
│  ┌───────────┐  ┌───────────┐  ┌──────┴──────┐  ┌───────────────┐  │
│  │ store.ts  │  │ loaders.ts│  │ publisher.ts│  │  bootstrap.ts │  │
│  │ EventStore│  │ subscribe │  │  signEvent  │  │  hostname     │  │
│  │ RelayPool │  │ hydrate   │  │  pool.event │  │  relay list   │  │
│  └───────────┘  └───────────┘  └─────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                 Nostr Relays (WebSocket)
```

### Component Responsibilities

| Component | Responsibility | Location |
|-----------|----------------|----------|
| `signer.svelte.ts` | Singleton reactive auth state: active signer, derived pubkey, isOwner | `src/lib/nostr/signer.svelte.ts` (NEW) |
| `publisher.ts` | Stateless write helpers: build + sign + publish events to pool | `src/lib/nostr/publisher.ts` (NEW) |
| `LoginModal.svelte` | NIP-07 extension detection + NIP-46 bunker URI + QR code flow | `src/lib/components/LoginModal.svelte` (NEW) |
| `ThemePicker.svelte` | Fetch kind 36767 themes, preview, publish kind 16767 — zero external deps | `src/lib/components/ThemePicker.svelte` (NEW) |
| `NsiteManager.svelte` | Edit/delete nsites using signer; renders only when `isOwner` | `src/lib/components/NsiteManager.svelte` (NEW) |
| `+page.svelte` | Existing orchestrator; gains conditional owner UI sections | `src/routes/+page.svelte` (modified) |
| `store.ts` | Unchanged: EventStore + RelayPool singletons | `src/lib/nostr/store.ts` |
| `loaders.ts` | Unchanged: relay subscriptions, NsiteEntry extraction | `src/lib/nostr/loaders.ts` |
| `theme.ts` | Unchanged: parse + apply kind 16767 events; ThemePicker imports it | `src/lib/theme.ts` |

---

## Recommended Project Structure

```
src/lib/
├── nostr/
│   ├── store.ts          # unchanged — EventStore + RelayPool singletons
│   ├── bootstrap.ts      # unchanged — hostname parsing, relay list, URL builder
│   ├── loaders.ts        # unchanged — relay subscriptions, NsiteEntry extraction
│   ├── cache.ts          # unchanged — localStorage persistence
│   ├── signer.svelte.ts  # NEW — reactive auth state (ISigner, pubkey, isOwner)
│   └── publisher.ts      # NEW — stateless write: signEvent + publish to pool
├── components/
│   ├── ProfileCard.svelte    # unchanged
│   ├── NsiteList.svelte      # unchanged (or minor: add edit/delete buttons)
│   ├── ErrorMessage.svelte   # unchanged
│   ├── LoadingSpinner.svelte # unchanged
│   ├── LoginModal.svelte     # NEW — NIP-07 + NIP-46 login UI
│   ├── ThemePicker.svelte    # NEW — isolated theme selection component
│   └── NsiteManager.svelte  # NEW — owner-only edit/delete UI
├── theme.ts                  # unchanged — ThemePicker reads this
├── avatarShape.ts            # unchanged
└── index.ts                  # unchanged (barrel, currently empty)
```

### Structure Rationale

- **`signer.svelte.ts` not `.ts`:** Svelte 5 runes (`$state`, `$derived`) only work reactively across modules when placed in `.svelte.ts` files. Plain `.ts` files do not participate in Svelte's reactivity graph at module scope.
- **`publisher.ts` as pure `.ts`:** The publish helpers are stateless side-effecting functions with no reactive state. Plain `.ts` is correct — they accept a signer parameter rather than reading from global state.
- **`ThemePicker.svelte` has no import of `signer.svelte.ts`:** The component receives the signer as a `$prop`. This is the isolatability guarantee — the component can be extracted into a standalone package without pulling in this app's auth state.
- **Owner-gated UI stays in `+page.svelte`:** The page orchestrator already owns all conditional rendering. Keeping `isOwner` checks in the orchestrator (rather than inside each sub-component) keeps sub-components reusable.

---

## Architectural Patterns

### Pattern 1: Reactive Auth Singleton via `.svelte.ts`

**What:** A `.svelte.ts` module holds global `$state` for the active signer and its derived pubkey. Components import this module directly — no Svelte context or prop drilling needed.

**When to use:** Whenever multiple components in the same SPA session need read access to auth state, and the state has a single source of truth with no SSR concern (this app disables SSR in `+layout.ts`).

**Trade-offs:** Simple to read from any component; safe here because SSR is disabled. If SSR were ever re-enabled, this would need to move into SvelteKit's `event.locals` pattern.

**Example:**
```typescript
// src/lib/nostr/signer.svelte.ts
import type { ISigner } from 'applesauce-signers';

let _signer = $state<ISigner | null>(null);
let _pubkey = $state<string | null>(null);

export const auth = {
  get signer() { return _signer; },
  get pubkey() { return _pubkey; },
  isOwner(sitePubkey: string) {
    return _pubkey !== null && _pubkey === sitePubkey;
  },
  async setSigner(signer: ISigner) {
    _signer = signer;
    _pubkey = await signer.getPublicKey();
  },
  clear() {
    _signer = null;
    _pubkey = null;
  }
};
```

```svelte
<!-- anywhere in the app -->
<script>
  import { auth } from '$lib/nostr/signer.svelte.ts';
</script>
{#if auth.isOwner(pubkey)}
  <!-- owner UI -->
{/if}
```

### Pattern 2: Signer Passed as Prop to ThemePicker

**What:** `ThemePicker.svelte` receives the active signer as a required `$prop` rather than importing `auth` from the app's singleton. It also receives the site `pubkey` and an optional initial `theme`.

**When to use:** Whenever a component is designed for future extraction as a standalone package. The component should not depend on any module outside its own boundary.

**Trade-offs:** Tiny extra prop at the call site. Enables standalone extraction with zero refactoring — the component has no cross-module imports beyond `nostr-tools` types.

**Example:**
```svelte
<!-- ThemePicker.svelte -->
<script lang="ts">
  import type { ISigner } from 'applesauce-signers';
  import type { RelayPool } from 'applesauce-relay';

  interface Props {
    signer: ISigner;
    pubkey: string;
    relays: string[];
    pool: RelayPool;
    onClose: () => void;
  }
  let { signer, pubkey, relays, pool, onClose }: Props = $props();
</script>
```

### Pattern 3: Publisher as Stateless Helper Module

**What:** `publisher.ts` exports plain async functions that accept a signer, a relay list, and event template data. They build the event, sign it, and publish it via the existing `pool` singleton.

**When to use:** Write operations. Keeping them stateless means they are easily testable (in the future) and do not create hidden coupling between auth state and the Nostr layer.

**Trade-offs:** The caller must pass `signer` explicitly. This is intentional and consistent with Pattern 2.

**Example:**
```typescript
// src/lib/nostr/publisher.ts
import type { ISigner } from 'applesauce-signers';
import { pool } from './store';

export async function publishEvent(
  signer: ISigner,
  relays: string[],
  template: { kind: number; tags: string[][]; content: string }
): Promise<void> {
  const pubkey = await signer.getPublicKey();
  const event = await signer.signEvent({
    ...template,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
  });
  pool.event(relays, event);
}
```

### Pattern 4: NIP-46 Bunker URI + nostrconnect:// Flow

**What:** `LoginModal.svelte` supports two NIP-46 sub-flows: (a) user pastes a `bunker://` URI and clicks Connect — uses `NostrConnectSigner.fromBunkerURI()`; (b) app generates a `nostrconnect://` URI displayed as QR code that the bunker scans to initiate. The relay field is editable and reactively updates both the URI text and the QR code rendered from it.

**When to use:** NIP-46 login path. NIP-07 path is simpler: check `window.nostr`, call `new ExtensionSigner()`, done.

**Trade-offs:** NIP-46 connection is async and may take seconds. The modal must display a loading state during `fromBunkerURI()`. The `nostrconnect://` flow requires polling for the bunker's response; `NostrConnectSigner` handles this internally but the modal must handle the `await` gracefully with an abort option.

**Example shape:**
```svelte
<!-- LoginModal.svelte -->
<script lang="ts">
  import { ExtensionSigner, NostrConnectSigner } from 'applesauce-signers';
  import { auth } from '$lib/nostr/signer.svelte.ts';

  // NIP-46 state
  let bunkerUri = $state('');
  let relayOverride = $state('wss://relay.nsec.app');
  let connecting = $state(false);
  let nostrConnectUri = $derived(
    buildNostrConnectUri(relayOverride) // regenerates on relay change
  );

  async function loginNip07() {
    const signer = new ExtensionSigner();
    await auth.setSigner(signer);
    // close modal
  }

  async function loginBunker() {
    connecting = true;
    try {
      const signer = await NostrConnectSigner.fromBunkerURI(bunkerUri);
      await auth.setSigner(signer);
    } finally {
      connecting = false;
    }
  }
</script>
```

---

## Data Flow

### Read Flow (unchanged from existing app)

```
Hostname → pubkey
    ↓
localStorage cache → EventStore (instant render)
    ↓
RelayPool.req() → relay events → EventStore → RxJS subscriptions
    ↓
Svelte $state in +page.svelte → component props → rendered UI
```

### Login Flow (new)

```
User clicks "Login" in footer
    ↓
LoginModal opens
    ↓
NIP-07 path:           NIP-46 bunker URI path:     nostrconnect:// path:
  new ExtensionSigner()   NostrConnectSigner          NostrConnectSigner
  .getPublicKey()         .fromBunkerURI(uri)         .getNostrConnectUri()
                                                       → display QR, await scan
    ↓                        ↓                            ↓
  auth.setSigner(signer)  ← ← ← ← ← ← ← ← ← ← ← ← ← ←
    ↓
  auth.pubkey $state updates
    ↓
  auth.isOwner(sitePubkey) $derived becomes true
    ↓
  +page.svelte conditionally renders theme button + nsite manager
```

### Theme Publish Flow (new)

```
Owner clicks "Theme" button
    ↓
ThemePicker modal opens
    ↓
EventStore.getByFilters({ kinds: [36767] }) → curated theme list
    ↓
User selects theme (or pastes nevent) → preview via applyTheme()
    ↓
User confirms → publisher.publishEvent(signer, relays, { kind: 16767, ... })
    ↓
RelayPool.event() → relays
    ↓
EventStore subscription picks up own published event → theme applies
```

### Nsite Edit Flow (new)

```
Owner clicks edit on NsiteList item
    ↓
NsiteManager shows inline edit form (title, description)
    ↓
User saves → publisher.publishEvent(signer, relays, { kind: 35128 or 15128, ... })
    ↓
RelayPool.event() → relays
    ↓
EventStore replaceable-event dedup updates NsiteEntry in store → UI refreshes
```

### Nsite Delete Flow (new)

```
Owner clicks delete on NsiteList item
    ↓
Confirmation prompt
    ↓
publisher.publishDeletion(signer, relays, eventId, kind)
    → kind 5 event with e tag (event id) and k tag (kind)
    ↓
RelayPool.event() → relays
    ↓
EventStore: caller removes event from local store immediately for instant UI feedback
    (relay may or may not honor deletion)
```

### State Management Summary

```
auth (signer.svelte.ts)         ← user logs in/out
    ↓ isOwner($derived)
+page.svelte $state             ← RxJS EventStore subscriptions
    ↓ props
ProfileCard, NsiteList,         ← read-only display
ThemePicker ($prop: signer),    ← needs signer to publish
NsiteManager ($prop: signer)    ← needs signer to publish
```

---

## Suggested Build Order

The dependencies between components determine safe merge order for separate branches:

1. **`signer.svelte.ts` + `publisher.ts` (Auth foundation)**
   No UI deps. Pure logic. All subsequent features depend on this.
   Branch: `feature/auth-signer`

2. **`LoginModal.svelte` + footer login link in `+page.svelte`**
   Depends on: `signer.svelte.ts`, `applesauce-signers` installed.
   Delivers owner detection even before any management UI exists.
   Branch: `feature/login-modal`

3. **`ThemePicker.svelte`**
   Depends on: `signer.svelte.ts` (for `auth.signer` prop source in page), `publisher.ts`, `theme.ts` (already exists).
   Fully isolated by design — receives signer as prop, not from auth singleton.
   Branch: `feature/theme-picker`

4. **`NsiteManager.svelte` (edit/delete)**
   Depends on: `signer.svelte.ts`, `publisher.ts`, `NsiteEntry` type (already exists).
   Rendered only when `auth.isOwner(pubkey)` is true.
   Branch: `feature/nsite-management`

---

## Anti-Patterns

### Anti-Pattern 1: Putting ISigner in EventStore or RelayPool

**What people do:** Store the active signer on the existing `eventStore` or `pool` singletons since they are already global.

**Why it's wrong:** `eventStore` and `pool` are read-only data infrastructure from `applesauce-core/relay`. Mixing write credentials into them couples concerns, makes the auth state invisible/surprising to readers, and creates a maintenance burden when upgrading applesauce.

**Do this instead:** Keep signer in `signer.svelte.ts` — a separate, clearly named module whose sole concern is auth state.

### Anti-Pattern 2: Importing `auth` inside ThemePicker

**What people do:** Import `auth.signer` directly inside `ThemePicker.svelte` because it is convenient.

**Why it's wrong:** Breaks extractability. If ThemePicker has any import from `$lib/nostr/signer.svelte.ts`, it cannot be published as a standalone package without bringing the whole app's auth layer with it.

**Do this instead:** Pass `signer` as a `$prop`. The parent page already has `auth.signer` and simply threads it through.

### Anti-Pattern 3: Updating kind 16767 by editing the existing event

**What people do:** Fetch the current kind 16767 event, mutate its tags, re-sign, and publish.

**Why it's wrong:** kind 16767 is a replaceable event (10000-19999). Publishing a new one with the same pubkey + kind automatically replaces the old one on relays. There is no need to fetch the old event — just publish the new state.

**Do this instead:** Build the new kind 16767 event from the selected theme data directly and publish. The EventStore's replaceable-event dedup will handle local state.

### Anti-Pattern 4: NIP-46 blocking the entire page on login

**What people do:** `await NostrConnectSigner.fromBunkerURI(uri)` at the top level of the page before rendering anything.

**Why it's wrong:** NIP-46 connection can take several seconds (relay round-trip + user approval on the bunker). Blocking the full page prevents visitors from seeing the public profile while the owner logs in.

**Do this instead:** Keep login in a modal. The page renders the public profile immediately. Login is a parallel concern that resolves into `auth.signer` when complete, which then reactively reveals owner UI.

### Anti-Pattern 5: Storing the signer in localStorage

**What people do:** Serialize and cache the signer object to survive page refreshes.

**Why it's wrong:** `ISigner` instances are stateful objects with open relay subscriptions (NIP-46) or references to `window.nostr` (NIP-07). They cannot be serialized. Re-login on each session is the correct UX for a management page accessed only by the owner.

**Do this instead:** On page load, `auth.signer` starts `null`. The login modal is fast to open; session persistence is not needed for this use case.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| NIP-07 browser extension | `ExtensionSigner` wraps `window.nostr` | Check `window.nostr !== undefined` before offering this option |
| NIP-46 bunker relay | `NostrConnectSigner.fromBunkerURI()` or `getNostrConnectUri()` | Relay field should be editable; updates both URI text and QR |
| Nostr relays (write) | `pool.event(relays, signedEvent)` | Reuse existing `pool` singleton from `store.ts` |
| kind 36767 theme source | `pool.req(relays, [{ kinds: [36767] }])` | Fetch from bootstrap relays at ThemePicker open |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `auth` → `+page.svelte` | Direct import of `signer.svelte.ts` | `$derived` reactivity updates page state automatically |
| `+page.svelte` → `ThemePicker` | `$prop: signer` | No singleton import inside ThemePicker |
| `+page.svelte` → `NsiteManager` | `$prop: signer, nsites` | NsiteManager is owner-only rendered |
| `publisher.ts` → `pool` | Direct import of `store.ts` | publisher is a thin facade over `pool.event()` |
| `ThemePicker` → `theme.ts` | Direct import | `applyTheme()` for live preview; acceptable — both are extractable together |

---

## Scaling Considerations

This is a static SPA with no server; scale concerns are Nostr relay bandwidth only.

| Scale | Consideration |
|-------|--------------|
| Single owner using management features | No concern — writes are rare events |
| Visitor load | Unchanged from existing app — relay reads, no auth |
| Theme catalogue growth | kind 36767 list fetched once on ThemePicker open; pagination not needed at any realistic scale |

---

## Sources

- applesauce-signers ExtensionSigner: [https://github.com/hzrd149/applesauce/blob/master/packages/signers/src/signers/extension-signer.ts](https://github.com/hzrd149/applesauce/blob/master/packages/signers/src/signers/extension-signer.ts) — HIGH confidence (official source)
- applesauce-signers NostrConnectSigner: [https://github.com/hzrd149/applesauce/blob/master/packages/signers/src/signers/nostr-connect-signer.ts](https://github.com/hzrd149/applesauce/blob/master/packages/signers/src/signers/nostr-connect-signer.ts) — HIGH confidence (official source)
- applesauce packages overview: [https://applesauce.build/](https://applesauce.build/) — HIGH confidence
- nostr-tools BunkerSigner (NIP-46): [https://github.com/nbd-wtf/nostr-tools/blob/master/nip46.ts](https://github.com/nbd-wtf/nostr-tools/blob/master/nip46.ts) — HIGH confidence (official source)
- NIP-09 deletion events: [https://nips.nostr.com/9](https://nips.nostr.com/9) — HIGH confidence (official NIP)
- NIP-46 remote signing: [https://nips.nostr.com/46](https://nips.nostr.com/46) — HIGH confidence (official NIP)
- Svelte 5 global state patterns: [https://mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/](https://mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/) — HIGH confidence (verified against Svelte 5 runes docs)

---
*Architecture research for: Nostr nsite management SPA login, theme picker, and nsite management*
*Researched: 2026-04-09*
