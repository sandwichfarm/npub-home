# External Integrations

**Analysis Date:** 2026-04-09

## APIs & External Services

**Nostr Protocol (primary integration):**
- The entire application is built on the Nostr protocol. It connects to Nostr relays via WebSocket, fetches events, and renders them as a profile landing page.
- SDK/Client: `applesauce-relay` (`RelayPool`) in `src/lib/nostr/store.ts`
- Event management: `applesauce-core` (`EventStore`) in `src/lib/nostr/store.ts`
- Protocol utilities: `nostr-tools` (NIP-19 encoding) in `src/lib/nostr/bootstrap.ts`
- Auth: None required (Nostr relays are public-read)

**Nostr Event Kinds Used:**
- Kind `0` - Profile metadata (name, picture, banner, about, website, nip05, shape)
  - Queried in `src/lib/nostr/loaders.ts`
  - Consumed via `eventStore.profile()` in `src/routes/+page.svelte`
- Kind `10002` - Relay list (NIP-65)
  - Queried in `src/lib/nostr/loaders.ts`
  - Used to discover the user's preferred relays and query them too
- Kind `35128` - Named nsite entries (replaceable, d-tag = slug)
  - Queried in `src/lib/nostr/loaders.ts`
  - Parsed in `getNsitesFromStore()` in `src/lib/nostr/loaders.ts`
- Kind `15128` - Root nsite entry
  - Queried in `src/lib/nostr/loaders.ts`
  - Parsed in `getNsitesFromStore()` with `includeRoot` option
- Kind `16767` - Active profile theme (colors, fonts, backgrounds)
  - Queried in `src/lib/nostr/loaders.ts`
  - Parsed in `parseActiveProfileTheme()` in `src/lib/theme.ts`
  - Applied to DOM as CSS custom properties

## Nostr Relay Connections

**Bootstrap Relays (hardcoded in `src/lib/nostr/bootstrap.ts`):**
- `wss://purplepag.es` - Profile/relay-list discovery relay
- `wss://relay.damus.io` - General-purpose relay
- `wss://nos.lol` - General-purpose relay
- `wss://lunchbox.sandwich.farm` - Personal relay

**User Relays (dynamic):**
- Discovered from kind `10002` events at runtime
- Filtered to exclude bootstrap relays already queried
- Used for secondary queries of profile, nsite, and theme events

**Connection Pattern:**
- `RelayPool` from `applesauce-relay` manages WebSocket connections
- `pool.req(relays, filters)` returns an RxJS Observable
- Events stream reactively into `EventStore`
- Two-phase relay discovery: bootstrap relays first, then user's own relays from kind 10002

## Data Storage

**Databases:**
- None. This is a client-side SPA with no backend.

**Client-Side Caching:**
- `localStorage` used for event caching (`src/lib/nostr/cache.ts`)
- Cache key format: `nostr-events:<pubkey>`
- Stores serialized `NostrEvent[]` per pubkey
- Handles replaceable event deduplication (kinds 0, 3, 10000-19999, 30000-39999)
- Hydrated on page load for instant rendering before relay responses arrive

**File Storage:**
- None (static SPA)

**Caching:**
- In-memory: `EventStore` singleton holds all events during session (`src/lib/nostr/store.ts`)
- In-memory: Emoji mask canvas renders cached in `Map<string, string>` (`src/lib/avatarShape.ts`)
- Persistent: localStorage event cache (`src/lib/nostr/cache.ts`)

## Authentication & Identity

**Auth Provider:**
- None. The app is read-only and unauthenticated.
- Identity is derived from the hostname: the subdomain contains the npub (Nostr public key)
- Parsing logic in `parseNpubFromHostname()` in `src/lib/nostr/bootstrap.ts`

**Identity Resolution:**
- Format 1: `npub1xxx.nsite-host.com` - Direct npub in subdomain
- Format 2: `<base36pubkey><dtag>.nsite-host.com` - Base36-encoded pubkey + site identifier
- Localhost fallback: Uses `VITE_DEV_NPUB` env var

## Monitoring & Observability

**Error Tracking:**
- None. Errors are silently caught or shown in UI via `ErrorMessage.svelte`.

**Logs:**
- None. No logging framework. Silent catch blocks in `src/lib/nostr/cache.ts` and `src/lib/nostr/bootstrap.ts`.

## CI/CD & Deployment

**Hosting:**
- nsite protocol (Nostr-based static site hosting)
- Configuration in `.nsite/named.json`:
  - Relays: `wss://nsite.run`, `wss://nos.lol`, `wss://relay.damus.io`
  - Blossom servers: `https://blssm.us`, `https://cdn.hzrd149.com`

**CI Pipeline:**
- None detected. No GitHub Actions, no CI config files.

**Build Output:**
- Static SPA in `dist/` directory
- Deployed to nsite infrastructure (Nostr relays + Blossom CDN)

## Environment Configuration

**Required env vars (development only):**
- `VITE_DEV_NPUB` - npub for localhost testing (read in `src/lib/nostr/bootstrap.ts`)

**Required env vars (production):**
- None. The app derives all context from the hostname.

**Secrets:**
- `.nsite/config.json` - May contain bunker keys for deployment (existence noted, not read)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Third-Party Web Components

**@nsite/stealthis (v0.2.0):**
- Dynamically imported in `src/routes/+page.svelte` via `import('@nsite/stealthis')`
- Registers `<nsite-deploy>` custom element
- Renders a "steal this nsite" button with QR code functionality
- Dependencies: `nostr-tools`, `qrcode-generator`
- Loaded only on mount (not in bundle critical path)

## Theming Integration

**Profile Theme System (kind 16767):**
- Parses theme events from Nostr in `src/lib/theme.ts`
- Supports two formats:
  - Tag-based: `c` tags with hex color values for background/text/primary
  - Legacy JSON: Colors as HSL strings in event content
- Font support: `f` tag with family name and optional URL (loaded via `@font-face`)
- Background image: `bg` tag with URL, mode (cover/tile), and mime type
- Applied to DOM by injecting `<style>` elements with CSS custom properties
- Tokens derived from 3 core colors: `background`, `text`, `primary` (generates 12 design tokens)

---

*Integration audit: 2026-04-09*
