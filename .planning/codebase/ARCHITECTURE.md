# Architecture

**Analysis Date:** 2026-04-09

## Pattern Overview

**Overall:** Client-side Single-Page Application (SPA) with reactive event-driven data flow

**Key Characteristics:**
- Fully client-side rendered SPA (SSR disabled, static adapter outputs to `dist/`)
- Reactive streaming architecture: Nostr events flow from relays into a centralized EventStore, UI reacts to store changes via RxJS subscriptions
- Single-page app with one route (`+page.svelte`) that acts as the orchestrator
- Domain-driven identity: the user's public key is parsed from the hostname, not from login or URL params
- No backend or API server; all data comes from Nostr relays over WebSockets

## Layers

**Presentation Layer:**
- Purpose: Render UI based on reactive state derived from the EventStore
- Location: `src/lib/components/` and `src/routes/+page.svelte`
- Contains: Svelte 5 components using `$props()`, `$state()`, and `$derived()` runes
- Depends on: Nostr layer (loaders, store, bootstrap), Theme layer
- Used by: SvelteKit routing

**Nostr Data Layer:**
- Purpose: Manage relay connections, event subscriptions, caching, and event storage
- Location: `src/lib/nostr/`
- Contains: EventStore + RelayPool singletons (`store.ts`), relay subscription logic (`loaders.ts`), hostname parsing and URL building (`bootstrap.ts`), localStorage caching (`cache.ts`)
- Depends on: `applesauce-core`, `applesauce-relay`, `nostr-tools`, `rxjs`
- Used by: Presentation layer (`+page.svelte`)

**Theme Layer:**
- Purpose: Parse kind 16767 Nostr events into theme tokens and apply them as CSS custom properties
- Location: `src/lib/theme.ts`
- Contains: HSL/RGB color utilities, theme token derivation, DOM style injection
- Depends on: `nostr-tools` (type only)
- Used by: `+page.svelte` (reactive theme subscription)

**Utility Layer:**
- Purpose: Provide shared helper functions
- Location: `src/lib/avatarShape.ts`
- Contains: Emoji detection, canvas-based alpha mask generation for avatar shapes
- Depends on: Browser Canvas API
- Used by: `ProfileCard.svelte`

## Data Flow

**Startup and Data Loading (in `+page.svelte` onMount):**

1. `parseNpubFromHostname()` extracts the pubkey from `window.location.hostname` (or `VITE_DEV_NPUB` on localhost)
2. `hydrateFromCache(pubkey)` loads previously cached events from localStorage into the EventStore for instant rendering
3. `subscribe(pubkey)` opens WebSocket subscriptions to bootstrap relays for kinds 0, 10002, 15128, 35128, 16767
4. As events arrive from relays, `addToStore()` inserts them into the EventStore and caches them in localStorage
5. When a kind 10002 relay list event arrives, additional subscriptions are opened to the user's own relays (relay discovery)
6. RxJS subscriptions on `eventStore.profile()` and `eventStore.filters()` reactively update Svelte `$state` variables
7. Svelte's reactivity re-renders components as state changes

**Relay Discovery (secondary subscriptions):**

1. Bootstrap relays (hardcoded in `bootstrap.ts`) are queried first for kind 10002 events
2. `eventStore.filters({ kinds: [10002] })` emits when relay list events arrive
3. Relay URLs are extracted from `r` tags on the event
4. New subscriptions are opened to these user-specified relays for kinds 0, 35128, 15128, 16767
5. Events from user relays flow into the same EventStore and cache

**Theme Application:**

1. `eventStore.filters({ kinds: [16767] })` subscription fires when theme events arrive
2. `parseActiveProfileTheme()` parses color tags (`c` tags), font tags (`f` tags), and background tags (`bg` tags) from the event
3. `deriveTokens()` generates a full set of design tokens (12 tokens) from 3 core colors (background, text, primary)
4. `applyTheme()` injects CSS custom properties onto `:root` via dynamically created `<style>` elements
5. Font `@font-face` rules and `body` background styles are also injected dynamically

**State Management:**
- Global state: `eventStore` (applesauce-core `EventStore` singleton) and `pool` (applesauce-relay `RelayPool` singleton) in `src/lib/nostr/store.ts`
- Component state: Svelte 5 runes (`$state`, `$derived`, `$props`) for local reactive state
- Persistence: localStorage cache per pubkey, keyed as `nostr-events:{pubkey}`
- No Svelte stores (`writable`/`readable`); all reactivity flows through RxJS observables from the EventStore, bridged to Svelte state in `onMount`

## Key Abstractions

**EventStore (from applesauce-core):**
- Purpose: Central in-memory store for all Nostr events, queryable by filters
- Examples: `src/lib/nostr/store.ts`
- Pattern: Singleton export, queried via `.profile(pubkey)`, `.filters({...})`, `.getByFilters({...})`

**RelayPool (from applesauce-relay):**
- Purpose: Manages WebSocket connections to multiple Nostr relays, provides `.req()` for subscriptions
- Examples: `src/lib/nostr/store.ts`
- Pattern: Singleton export, `.req(relays, filters)` returns an RxJS Observable of events

**NsiteEntry:**
- Purpose: Normalized representation of an nsite (named subsite) for display
- Examples: `src/lib/nostr/loaders.ts`
- Pattern: Interface with `slug`, `createdAt`, `title`, `description` fields, extracted from kind 35128/15128 events

**ParsedHost:**
- Purpose: Result of parsing the hostname to extract npub, pubkey, and optional named site identifier
- Examples: `src/lib/nostr/bootstrap.ts`
- Pattern: Interface returned by `parseNpubFromHostname()`

**ActiveProfileTheme:**
- Purpose: Parsed theme data from a kind 16767 event, ready for DOM application
- Examples: `src/lib/theme.ts`
- Pattern: Interface with `colors`, optional `font`, optional `background`

## Entry Points

**SvelteKit HTML Shell:**
- Location: `src/app.html`
- Triggers: Initial page load
- Responsibilities: HTML boilerplate, SvelteKit head/body placeholder injection

**Layout:**
- Location: `src/routes/+layout.svelte` and `src/routes/+layout.ts`
- Triggers: Every route load
- Responsibilities: Disables SSR (`ssr = false`, `prerender = false`), imports `app.css`, sets favicon

**Main Page (Orchestrator):**
- Location: `src/routes/+page.svelte`
- Triggers: App load (single route SPA)
- Responsibilities: Parses hostname, initializes Nostr subscriptions, wires reactive state to components, manages cleanup on unmount

## Error Handling

**Strategy:** Graceful degradation with user-facing error messages

**Patterns:**
- Hostname parsing failure shows an `ErrorMessage` component with guidance to deploy to an nsite domain
- localStorage operations wrapped in try/catch with silent fallback (cache unavailable does not break the app)
- Invalid npub/base36 decoding caught silently, returns `null`
- Missing profile data handled with fallback display (first letter avatar, truncated npub as name)
- No global error boundary; errors are handled locally at each point of failure

## Cross-Cutting Concerns

**Logging:** No logging framework. Silent error handling throughout (`catch {}` blocks).

**Validation:** Hostname parsing validates npub format (prefix + length), base36 named site format (regex + length constraints). No form validation needed (read-only app).

**Authentication:** None. The app is a public read-only viewer. Identity is derived from the hostname, not user credentials.

**Caching:** localStorage-based event cache in `src/lib/nostr/cache.ts`. Replaceable events (kinds 0, 10000-19999, 30000-39999) are deduplicated by kind + pubkey + d-tag. Cache is keyed per pubkey.

**Theming:** CSS custom properties defined in `src/app.css` as defaults (dark purple theme), dynamically overridden by kind 16767 events via `src/lib/theme.ts`. Token system uses HSL color space with 12 derived tokens from 3 core colors.

## Nostr Event Kinds Used

| Kind | Purpose | Type |
|------|---------|------|
| 0 | User profile metadata | Replaceable |
| 10002 | Relay list (NIP-65) | Replaceable |
| 15128 | Root nsite event | Replaceable |
| 35128 | Named nsite events | Parameterized replaceable |
| 16767 | Active profile theme | Ephemeral replaceable |

## Third-Party Web Component

The app dynamically imports `@nsite/stealthis` in `onMount`, which registers the `<nsite-deploy>` web component used as a "Steal this nsite" button at the bottom of the page.

---

*Architecture analysis: 2026-04-09*
