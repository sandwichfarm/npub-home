# npub-home

## What This Is

npub-home is a client-side SPA that serves as a landing page for a Nostr user's nsites (static websites discovered over Nostr via NIP-5A and hosted by Blossom). The user's identity is derived from the hostname — no login required for visitors. It fetches profile metadata, nsite entries, and theme data from Nostr relays and renders a themed profile page with links to the user's nsites.

## Core Value

Show a Nostr user's nsites in one place, styled with their profile theme, with zero configuration for visitors.

## Requirements

### Validated

- ✓ Profile display from kind 0 events (name, avatar, banner, bio) — existing
- ✓ Nsite listing from kind 35128 (named) and 15128 (root) events — existing
- ✓ Profile theme application from kind 16767 events (colors, fonts, backgrounds) — existing
- ✓ Relay discovery via kind 10002 (NIP-65) with two-phase loading — existing
- ✓ LocalStorage event caching for instant rendering — existing
- ✓ Hostname-based identity resolution (npub subdomain + base36 named sites) — existing
- ✓ "Steal this nsite" button via @nsite/stealthis web component — existing
- ✓ Error display when accessed outside nsite domain — existing

### Active

- [x] GitHub repo link in footer — Phase 4
- [x] Fix default background color (white → match container background when no Ditto theme is set) — Phase 4
- [x] Login system supporting NIP-07 (browser extension) and NIP-46 (remote signer with bunker URI, nostrconnect:// QR code, editable relay field) — Phase 1
- [x] Owner detection: logged-in pubkey === site npub unlocks management features — Phase 1
- [x] Theme picker modal: select from curated kind 36767 themes + paste/add nevent references, preview, and publish as kind 16767 — Phase 2
- [x] Theme picker built as a well-separated component (extractable for future standalone publication) — Phase 2
- [x] Nsite management: edit name/description of existing nsites (publish updated kind 35128/15128 events) — Phase 3
- [x] Nsite management: delete nsites via NIP-09 deletion events — Phase 3

### Out of Scope

- Backend or API server — this is a fully client-side app
- Creating new nsites — only managing existing entries
- Visitor-facing login features — login is only useful for the site owner
- Mobile app — web only
- SSR/SEO — static SPA by design

## Context

- The app is deployed via the nsite protocol (Nostr relays + Blossom CDN), built as a static SPA with SvelteKit's static adapter
- Stack: SvelteKit + Svelte 5 (runes), TypeScript, RxJS, applesauce-core/relay, nostr-tools
- Theme system already parses kind 16767 events and applies CSS custom properties; the new theme picker extends this to allow publishing themes
- NIP-46 bunker login requires showing both a bunker URI and a nostrconnect:// QR code; the relay field for the bunker connection should be editable by the user and update both the URI and QR code live
- GitHub repo: https://github.com/sandwichfarm/npub-home

## Constraints

- **Branching**: Each feature must be developed on a separate branch and published as a PR
- **Component isolation**: Theme picker must be architecturally separable for future extraction as a standalone package
- **Signing**: All write operations (theme publishing, nsite editing/deletion) use the logged-in signer (NIP-07 or NIP-46)
- **No backend**: All data flows through Nostr relays; no server-side logic

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Login in footer (small link) | Login only useful for site owner, not visitors | — Pending |
| Theme picker as modal dialog | Clean separation from main page, focused interaction | — Pending |
| NIP-07 + NIP-46 dual support | Maximum compatibility across signing methods | — Pending |
| NIP-09 for nsite deletion | Standard Nostr deletion mechanism | — Pending |
| Curated themes + custom nevents | Good defaults with flexibility to add any theme | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-09 after Phase 4 (UI Polish) completion — all phases complete*
