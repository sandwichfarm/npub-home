# Project Research Summary

**Project:** npub-home
**Domain:** Nostr nsite management SPA — owner-facing login, theme picker, and nsite management
**Researched:** 2026-04-09
**Confidence:** HIGH (stack and architecture verified via source inspection; MEDIUM for NIP-46 interop behavior due to spec churn)

## Executive Summary

npub-home is a client-side Svelte 5 SPA that serves dual roles: a public Nostr profile viewer for visitors, and a management layer for the site owner. The management layer is the new work this milestone introduces. Experts building this class of application on Nostr use the applesauce ecosystem for event handling and rely on NIP-07 (browser extension) and NIP-46 (remote signer / bunker) as the two authentication paths that cover the full range of self-sovereign Nostr key management. The existing codebase already has the correct foundation — applesauce-core, applesauce-relay, SvelteKit, and Svelte 5 runes — and the new work consists of wiring in applesauce-signers, two new modules (signer.svelte.ts for reactive auth state and publisher.ts for stateless event writes), and four new components (LoginModal, ThemePicker, NsiteManager, and minor additions to the existing NsiteList and page).

The recommended approach is to build in strict dependency order: auth foundation first, login modal second, then write-capable features (theme picker, nsite edit/delete) that all require an active signer. The primary differentiating feature — the theme picker with live preview — should be designed as an isolated component from day one: no singleton imports, all dependencies passed as props. This isolation is both an architectural discipline and a future-proofing measure for eventual extraction as a standalone Nostr package.

The dominant risk in this milestone is NIP-46 implementation complexity: the three-keypair model is a source of subtle bugs (using the bunker pubkey instead of the user pubkey for owner detection), relay behavior is inconsistent (stale ephemeral events without `since` filters), and session persistence requires storing a serialized BunkerPointer rather than the signer object itself. A secondary risk is publishing writes to the wrong relay set — the app must read the user's NIP-65 kind 10002 write relay list from the event store before publishing any event. Both risks have clear mitigations that must be applied at the phase where they first appear.

---

## Key Findings

### Recommended Stack

The existing stack requires minimal augmentation. The only new runtime dependencies are `applesauce-signers@5.2.0` (requires bumping applesauce-core and applesauce-relay from 5.1.0 to 5.2.0 — a patch release) and `lean-qr@2.7.1` (4.75 kB gzipped, zero deps, canvas output for the nostrconnect:// QR code). `bits-ui@2.17.3` should be added only if the team wants accessible dialog primitives for modals; native `<dialog>` is a valid alternative. The separate `applesauce-factory` npm package must NOT be used — it is at v4 and conflicts with the project's applesauce-core v5. EventFactory is already available inside applesauce-core v5 at `applesauce-core/event-factory`.

**Core technologies:**
- `applesauce-signers@5.2.0`: ExtensionSigner (NIP-07) and NostrConnectSigner (NIP-46) — in-ecosystem, type-compatible with existing EventSigner interface
- `lean-qr@2.7.1`: QR code for nostrconnect:// URI — framework-agnostic, smallest viable option
- `EventFactory` from `applesauce-core/event-factory`: builds and signs all new event types (kind 16767, kind 35128, kind 5) — already in the installed package
- `RelayPool.publish()` from `applesauce-relay`: write path — already in the installed package
- `bits-ui@2.17.3` (optional): accessible dialog/modal primitives for Svelte 5 — only if multiple modal components are planned

### Expected Features

All features in this milestone are P1 — there is nothing to defer from the active requirements list. The feature dependency graph is strictly ordered: login (NIP-07 and NIP-46) gates all management features; owner detection gates all write-capable UI; the theme picker, nsite editor, and nsite deletion all require an active signer.

**Must have (table stakes):**
- NIP-07 extension login — the de-facto standard; every Nostr power user has it
- NIP-46 bunker URI + nostrconnect QR — required for mobile/hardware signers; nsite ecosystem already uses bunkers natively
- Editable relay field for NIP-46 — companion to NIP-46; low cost, high correctness payoff
- Owner detection gate — management UI must be completely invisible to visitors
- Login state persistence + logout — baseline UX for any login system
- Nsite name/description edit (kind 35128 / kind 15128) — primary management action
- Nsite deletion via NIP-09 (kind 5) — completes the management surface
- Theme picker modal: curated kind 36767 themes + nevent paste + live preview + publish as kind 16767
- GitHub link in footer — trivial, already called out in PROJECT.md
- Default background color fix — visible quality issue, low effort

**Should have (competitive):**
- Live theme preview before publishing — applyTheme() already exists; this is not-yet-committed application of it
- Extractable theme picker component — architectural discipline during build; extraction deferred to post-validation
- nevent paste for custom themes — low cost, makes the picker open-ended without a comprehensive theme index

**Defer (v2+):**
- Profile metadata (kind 0) editing — served by existing dedicated tools; significant scope expansion
- Theme builder (custom color picker) — separate product scope; Ditto admin panel already provides this
- Standalone theme picker npm package — extract after proving the component in-app

### Architecture Approach

The architecture adds two new modules to the existing Nostr data layer and four new UI components to the presentation layer. Auth state lives in a dedicated `signer.svelte.ts` module (`.svelte.ts` extension required for Svelte 5 rune reactivity at module scope). Write operations go through a stateless `publisher.ts` that accepts the signer explicitly. The ThemePicker component is designed with no singleton imports — it receives signer, pubkey, relays, and pool as props — making it extractable without refactoring. All owner-gated conditional rendering stays in `+page.svelte` (the orchestrator) rather than inside sub-components, keeping sub-components reusable.

**Major components:**
1. `signer.svelte.ts` (NEW) — reactive auth singleton: `$state` signer, derived pubkey, `isOwner()` check; no UI
2. `publisher.ts` (NEW) — stateless write helpers: build + sign + publish events; accepts signer as parameter
3. `LoginModal.svelte` (NEW) — NIP-07 button + NIP-46 bunker URI input + nostrconnect QR code with editable relay field
4. `ThemePicker.svelte` (NEW) — fetch kind 36767 themes, live preview via existing `applyTheme()`, publish kind 16767; isolated by props
5. `NsiteManager.svelte` (NEW) — inline edit and delete UI for nsite entries; rendered only when `auth.isOwner()` is true
6. `+page.svelte` (modified) — gains conditional owner UI sections; existing orchestrator role unchanged

### Critical Pitfalls

1. **NIP-46 three-keypair confusion** — always call `await signer.getPublicKey()` after connect; never use the pubkey from the `bunker://` URI as the signing identity. This must be enforced in the login phase before any write operations exist.

2. **Stale NIP-46 relay replies** — add `since: Math.floor(Date.now() / 1000) - 10` to every kind 24133 subscription; deduplicate on RPC `id` field. Without this, ghost connections appear to succeed using stale relay data.

3. **Publishing to wrong relays (missing outbox model)** — before any `pool.publish()` call, resolve the user's NIP-65 kind 10002 write relays from the event store. The event store already has this data from the initial subscription. Applies to all three write features: theme publish, nsite edit, nsite delete.

4. **Theme picker tight coupling** — enforce props-only design at the start of the theme picker phase. Warning signs: any import of `pool`, `eventStore`, or `signer.svelte.ts` inside `ThemePicker.svelte`. Recovery cost if discovered late is high.

5. **NIP-09 deletion is advisory, not guaranteed** — label the action "Request deletion" in the UI; include `e` and `a` tags in the kind 5 event; include kind 5 in the bootstrap relay subscription filter so deletions persist across refreshes. Do not treat relay acknowledgment as proof of deletion.

---

## Implications for Roadmap

Based on the feature dependency graph and architectural build order from research, four phases emerge naturally. Each phase is deployable independently and delivers visible value.

### Phase 1: Auth Foundation

**Rationale:** Every management feature gates on login and owner detection. This has no UI dependencies and is the safest starting point — it can be merged and tested before any management UI exists. NIP-46 pitfalls (three-keypair confusion, stale relay replies, rate-limiting, session persistence) must all be addressed here, not discovered later when write operations complicate debugging.
**Delivers:** Working NIP-07 and NIP-46 login, owner detection, login persistence via BunkerPointer in localStorage, logout, login modal UI with QR code and editable relay field.
**Addresses:** NIP-07 login, NIP-46 bunker URI + QR, editable relay field, owner detection, persistence, logout.
**Avoids:** Three-keypair confusion, stale NIP-46 relay replies, rate-limiting on general relays, login state not surviving remount.
**New files:** `src/lib/nostr/signer.svelte.ts`, `src/lib/components/LoginModal.svelte`
**New packages:** `applesauce-signers@5.2.0`, `lean-qr@2.7.1`, optionally `bits-ui@2.17.3`

### Phase 2: Theme Picker

**Rationale:** The theme picker is the milestone's differentiating feature and the most architecturally complex component. Building it second, immediately after auth is proven, gives it the most time to stabilize. The isolated props-only design must be enforced at design time, before any implementation code is written.
**Delivers:** Curated theme selection, live preview, nevent paste, publish as kind 16767 to user's NIP-65 write relays.
**Addresses:** Theme picker modal, live theme preview, nevent paste.
**Avoids:** Theme picker tight coupling (enforce at component design), publishing to wrong relays (NIP-65 outbox required for kind 16767 publish).
**New files:** `src/lib/nostr/publisher.ts`, `src/lib/components/ThemePicker.svelte`

### Phase 3: Nsite Management (Edit + Delete)

**Rationale:** Edit and delete are functionally independent of the theme picker and can be built after theme picker is stable. publisher.ts and the NIP-65 outbox pattern are already established from Phase 2. The timestamp collision pitfall must be mitigated here with debounce and serialized writes.
**Delivers:** Inline name/description editing (kind 35128 / kind 15128), NIP-09 deletion with best-effort UX, kind 5 events in bootstrap subscription filter.
**Addresses:** Nsite name/description edit, nsite deletion.
**Avoids:** Replaceable event timestamp collision (debounce required), NIP-09 non-deletion UX pitfall, publishing to wrong relays.
**New files:** `src/lib/components/NsiteManager.svelte`, modifications to `src/lib/components/NsiteList.svelte` and `+page.svelte`

### Phase 4: Polish + Quick Wins

**Rationale:** These are independent of all other features and require no signer or write operations. Grouping them into a cleanup phase ensures they are not forgotten. They can alternatively be distributed into earlier phases if a developer needs low-risk tasks between complex ones.
**Delivers:** GitHub link in footer, default background color fix (eliminates white flash before theme loads).
**Addresses:** GitHub footer link, background color fix.
**Avoids:** N/A — no pitfall risk.

### Phase Ordering Rationale

- Auth ships first because the entire feature dependency graph flows from login. Shipping auth first creates a testable ownership gate that all subsequent phases can rely on without defensive coding.
- Theme picker ships second because it is the milestone's differentiating feature and the most complex component. Building it while the codebase is still clean avoids accruing tech debt before the hardest component arrives.
- Nsite management ships third because edit and delete are simpler than the theme picker (no relay fetch, no preview, just form + publish). By this phase, publisher.ts and the NIP-65 outbox pattern are already established.
- Polish ships last because it has zero risk and zero dependencies. Items can be pulled forward into any earlier phase if desired.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Auth):** NIP-46 is a live spec; interop between `NostrConnectSigner` and specific bunkers (nsecBunker, Amber) should be verified against current applesauce-signers 5.2.0 behavior, particularly `fromBunkerURI()` vs `getNostrConnectURI()` flows and BunkerPointer serialization for localStorage persistence.
- **Phase 2 (Theme Picker):** Kind 36767 theme event structure and available curated theme sources need concrete relay/event IDs before the fetch logic can be written. nevent decode path via nostr-tools nip19 is straightforward and needs no research.

Phases with standard patterns (skip research-phase):
- **Phase 3 (Nsite Management):** Kind 35128 structure is well-documented in the existing codebase; NIP-09 deletion is a simple kind 5 event; replaceable event behavior is standard applesauce-core.
- **Phase 4 (Polish):** Static link and CSS fix require no research.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | applesauce-signers v5.2.0 verified via npm registry and source inspection; lean-qr API verified via official docs; EventFactory location in applesauce-core v5 confirmed by .d.ts inspection; applesauce-factory v4 conflict confirmed |
| Features | HIGH | NIP-07, NIP-46, NIP-09 are official specs; kind 16767/36767/35128 event structures verified; UX patterns MEDIUM (Nostr tooling is nascent, limited comparative data) |
| Architecture | HIGH | Svelte 5 .svelte.ts module-scope reactivity verified against official runes docs; applesauce EventSigner interface confirmed compatible with both signers; build order validated against component dependency graph |
| Pitfalls | MEDIUM | NIP-46 interop pitfalls from community tracking and nostr-tools source; relay behavior varies by implementation; three-keypair confusion confirmed from NIP-46 spec reading; some pitfalls inferred from analogous Nostr client patterns |

**Overall confidence:** HIGH for implementation decisions; MEDIUM for NIP-46 relay interop edge cases.

### Gaps to Address

- **Kind 36767 curated theme sources:** The theme picker needs concrete relay endpoints and/or event IDs for a curated theme list. Research identified the kind number and schema but not a definitive source of existing themes. Address during Phase 2 planning by fetching from bootstrap relays to survey what exists, or pre-populating with known nevent references from the Ditto ecosystem.
- **BunkerPointer serialization format:** The exact localStorage serialization for persisting a NIP-46 BunkerPointer for reconnect without repeating the QR flow is implementation-dependent on applesauce-signers internals. Verify during Phase 1 implementation by reading the NostrConnectSigner source directly.
- **CSS injection sanitization for theme font.family:** CONCERNS.md already flags this. The publisher or theme application layer must sanitize `font.family` values from kind 16767 events to alphanumeric and spaces before CSS injection. Must be addressed in Phase 2 and is not yet resolved by research.

---

## Sources

### Primary (HIGH confidence)
- `applesauce-core/dist/event-factory/event-factory.d.ts` — EventFactory in applesauce-core v5, not separate package
- `applesauce-signers` GitHub source (hzrd149/applesauce) — ExtensionSigner, NostrConnectSigner APIs
- `applesauce-relay` README — pool.publish() API
- https://nips.nostr.com/7 — NIP-07 specification
- https://nips.nostr.com/9 — NIP-09 deletion specification
- https://nips.nostr.com/46 — NIP-46 remote signing specification
- https://nips.nostr.com/65 — NIP-65 outbox model
- https://qr.davidje13.com/docs/ — lean-qr API
- https://mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/ — Svelte 5 module-scope runes pattern

### Secondary (MEDIUM confidence)
- https://applesauce.build/typedoc/modules/applesauce-signers.html — applesauce-signers docs
- https://github.com/hzrd149/applesauce/blob/master/packages/signers/README.md — NostrConnectSigner API
- https://github.com/nostrability/nostrability/issues/73 — NIP-46 interop community tracker
- https://nostrify.dev/sign/connect — NIP-46 signer patterns
- https://nostrify.dev/relay/outbox — NIP-65 outbox model guide
- `.planning/codebase/CONCERNS.md` — existing codebase concerns audit

### Tertiary (LOW confidence)
- https://nostr-ux.com/ and https://nostrdesign.org/ — UX pattern recommendations; limited Nostr-specific comparative data available

---
*Research completed: 2026-04-09*
*Ready for roadmap: yes*
