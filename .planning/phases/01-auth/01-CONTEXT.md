# Phase 1: Auth - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the complete login system: NIP-07 browser extension and NIP-46 remote signer support, owner detection (logged-in pubkey === site npub), session persistence across reloads, and logout. The login link lives in the footer. After login, the page reactively shows owner-only UI (minimal in this phase — placeholder indicator and logout). No write operations are built here; signing capability is established for Phase 2 and 3 to consume.

</domain>

<decisions>
## Implementation Decisions

### Login UX Flow
- NIP-07 and NIP-46 presented as tabs ("Extension" and "Remote Signer") in a login modal
- If no NIP-07 extension detected, disable the Extension tab button with "No extension detected" tooltip
- Default NIP-46 relay: `wss://bucket.coracle.social`
- Login triggered from a text link "Login" in the footer, next to the GitHub link

### Session Persistence
- Login state stored in localStorage (persists across tabs and browser restarts)
- For NIP-46: persist bunker URI + relay URL (enough to reconnect without re-scanning QR)
- For NIP-07: persist just a flag (`auth:nip07`) — extension is always available
- Stale/invalid persisted session: silent fallback to logged-out state (clear stored data, show login link)

### Owner Detection & Management UI
- `isOwner` is a `$derived` flag in the auth singleton, computed from signer pubkey vs parsed hostname pubkey
- Phase 1 shows minimal placeholder: "Logged in as owner" indicator + logout button
- Footer login link becomes "Logout" with a small owner badge after login
- Auth state module uses `signer.svelte.ts` pattern (Svelte 5 `.svelte.ts` for reactive `$state`/`$derived` across modules)

### Claude's Discretion
- Internal component decomposition within the login modal
- Error message wording for connection failures
- Exact styling of the login modal (follow existing Tailwind patterns)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/nostr/store.ts` — `eventStore` and `pool` singletons (RelayPool for relay connections)
- `src/lib/nostr/bootstrap.ts` — `parseNpubFromHostname()` returns `ParsedHost` with `pubkey` field (needed for owner comparison)
- `src/lib/theme.ts` — `applyTheme()`/`clearTheme()` (no auth dependency)
- `src/lib/components/ErrorMessage.svelte` — reusable error display

### Established Patterns
- Svelte 5 runes: `$props()`, `$state()`, `$derived()` throughout
- RxJS observables from applesauce-core EventStore bridged to Svelte state in `onMount`
- All styling via Tailwind utility classes, no component `<style>` blocks
- Components in `src/lib/components/`, nostr logic in `src/lib/nostr/`
- Named exports, camelCase functions, PascalCase components/types

### Integration Points
- `src/routes/+page.svelte` — main orchestrator, will import auth singleton and conditionally render owner UI
- Footer area in `+page.svelte` — currently has the `<nsite-deploy>` button, login link goes next to it
- `src/lib/nostr/store.ts` — `pool` singleton needed by NIP-46 signer for relay communication

</code_context>

<specifics>
## Specific Ideas

- Research identified `applesauce-signers` as the signing library (`ExtensionSigner` for NIP-07, `NostrConnectSigner` for NIP-46)
- NIP-46 three-keypair trap: must call `await signer.getPublicKey()` after connect, never use bunker URI pubkey as signing identity
- `NostrConnectSigner` has `getNostrConnectURI()` for QR codes and `fromBunkerURI()` for paste flow
- `lean-qr` recommended for QR code generation (zero deps, 4.75 kB gzipped)
- Default NIP-46 relay changed to `wss://bucket.coracle.social` (nsec.app is gone)

</specifics>

<deferred>
## Deferred Ideas

- Theme picker modal (Phase 2)
- Nsite editing/deletion UI (Phase 3)
- Event publishing infrastructure (`publisher.ts`) — will be needed in Phase 2, not this phase

</deferred>
