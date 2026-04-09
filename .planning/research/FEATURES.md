# Feature Research

**Domain:** Nostr nsite landing page manager (owner-facing management layer on a public profile SPA)
**Researched:** 2026-04-09
**Confidence:** HIGH for Nostr protocol mechanics; MEDIUM for UX patterns (Nostr tooling is nascent)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features the site owner assumes exist. Missing these = management layer feels broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| NIP-07 extension login | Every Nostr power user has nos2x, Alby, or similar. "Login with extension" is the de-facto standard across Nostr web clients | LOW | `window.nostr.getPublicKey()` + `signEvent()` — straightforward. applesauce-signers `ExtensionSigner` wraps this cleanly |
| Owner detection gate | Any write-capable feature must only appear for the site owner. Visitors should see zero management UI | LOW | Compare logged-in pubkey to hostname-derived pubkey. Binary state: owner = true/false |
| Login state persistence | User expects to stay logged in across page reloads. Having to re-login on every visit is annoying | LOW | Store signer method + pubkey in localStorage. Re-hydrate on mount |
| Logout | Must be able to end session cleanly | LOW | Clear signer state + localStorage entry. Revert UI to visitor mode |
| NIP-46 bunker URI login | Increasingly common for mobile users and power users who don't use browser extensions. nsites are published via bunker (see .nsite/config.json bunkerPubkey) — the same signer workflow is already part of the nsite ecosystem | MEDIUM | Requires parsing bunker:// URI, relay pool connection, async connect() handshake via applesauce-signers `NostrConnectSigner` |
| nostrconnect:// QR code | Companion to bunker URI. Signer-initiated flow where the app shows a QR and waits for the bunker to connect. Required for mobile signers (Amber) | MEDIUM | Generate nostrconnect:// URI → render as QR code → poll for connect confirmation. Same `NostrConnectSigner.getNostrConnectURI()` path |
| Editable relay field for NIP-46 | The relay in the connection URI determines where messages flow. Users may need to change this if their bunker is on a non-default relay | LOW | Text input that updates the bunker URI and QR code reactively. Single field, live update |
| Nsite name/description edit | Owners expect to be able to rename their sites. This is the most basic content management action | MEDIUM | Read current kind 35128 / kind 15128 event → show editable fields → publish replacement event with updated title/description tags. Signing via logged-in signer |
| Nsite deletion | Owners need to remove stale or unused nsites. Absent this, the list grows indefinitely | MEDIUM | Publish NIP-09 deletion event (kind 5) referencing the nsite event ID + a-tag for addressable events. Must inform user that deletion is a request, not guaranteed |
| GitHub link in footer | Standard open-source project convention. Users expect to find source code link for community software | LOW | Static link to https://github.com/sandwichfarm/npub-home. Already called out in PROJECT.md |
| Default background color fix | Page body background currently defaults to white before a theme event loads, causing a flash. Users expect visual consistency from first render | LOW | Set body background-color in app.css or inline style to match the container/card background color token rather than browser default white |

### Differentiators (Competitive Advantage)

Features that set npub-home apart from generic Nostr profile viewers. These align directly with the Ditto/nsite ecosystem.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Theme picker modal (curated + nevent paste) | No other nsite tool offers in-page theme selection. Ditto themes are a first-class Nostr primitive (kind 36767 = shareable theme, kind 16767 = active profile theme) but there is no standalone picker UI. This bridges the gap | HIGH | Fetch curated kind 36767 themes from relays, display previews, allow nevent paste to add arbitrary themes, publish selection as kind 16767. Must be architecturally isolated for extraction as a standalone package |
| Live theme preview before publishing | Applying a theme preview without committing it lets the owner make an informed choice. Destructive publish-then-undo is a bad pattern for any customization flow | MEDIUM | Apply theme tokens to DOM on hover/select (using existing `applyTheme()`), revert on dismiss, publish only on explicit confirm |
| nevent paste for custom themes | Power users will have nevent references to specific Ditto themes from other Nostr clients. Supporting nevent paste makes the picker open-ended without requiring a comprehensive theme index | LOW | Decode nevent1 → extract event ID and relay hints → fetch the kind 36767 event → add to picker list |
| Owner-only management features behind detection gate | Management UI invisible to visitors keeps the page clean and professional. No separate admin URL needed | LOW | Already flows from owner detection. The differentiator is the polish: no empty states, no "unauthorized" pages, just context-sensitive UI |
| Extractable theme picker component | Building it as a well-separated Svelte 5 component with no hidden dependencies means it can become a standalone npm package for other nsite/Nostr clients | MEDIUM | Requires careful props-only design: theme picker takes signer, pubkey, relays as props and emits events. No direct imports of page-level globals |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem natural but should be explicitly excluded from this milestone.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| New nsite creation | "If I can edit, why can't I create?" | Creating an nsite involves file upload to Blossom servers, SHA-256 hashing of assets, publishing path tags — this is a full deployment workflow, not metadata editing. It is categorically different in scope and would bloat this SPA into a deployment tool | Use the dedicated nsyte CLI or nsite deployment tooling for creation; this app manages existing entries only |
| Profile metadata editing (kind 0) | Owners visiting their own page might want to update name/bio/avatar | Kind 0 editing is already served by dedicated Nostr profile managers (metadata.nostr.com, Primal, Ditto). Adding it here duplicates existing tools and expands scope beyond nsite management | Direct users to established profile editors |
| Visitor-facing login | Some users ask "why can't anyone log in?" | Login is only useful for the site owner to unlock management features. A visitor login flow would add complexity with no purpose — visitors have nothing to manage | Visitor-only mode is the correct UX for non-owners |
| Email / NIP-05 login | Lower friction for non-technical users | nostr-login supports OTP/email flows, but npub-home's audience is nsite owners — already technical Nostr users who have a key management solution. Adding email auth introduces a custodial dependency | NIP-07 + NIP-46 covers the full spectrum of self-sovereign key management |
| Real-time collaborative editing | Optimistic multi-user feel | Nsites are owned by a single pubkey. There is no multi-author Nostr primitive for nsites. Implementing this would require inventing a non-standard pattern | Single-owner model is correct; no workaround needed |
| Theme color customization / theme builder | "I want to make my own colors" | Building a full color picker + theme builder is a separate product (it is what Ditto's admin panel provides). The curated picker + nevent paste covers 95% of use cases without the builder complexity | Encourage users to use Ditto/Soapbox theme builder and paste the resulting nevent |

---

## Feature Dependencies

```
[NIP-07 login]  ──────────────────────────────────┐
[NIP-46 login]  ──────────────────────────────────┤
    ├──requires──> [Owner detection]               │
    │                   └──requires──> [Login state persistence]
    │
    ├──gates──> [Theme picker modal]
    │               └──requires──> [Live preview]
    │                   └──uses──> [existing applyTheme()]
    │
    ├──gates──> [Nsite name/description edit]
    │               └──requires──> [event signing via signer]
    │
    └──gates──> [Nsite deletion]
                    └──requires──> [event signing via signer]

[nostrconnect:// QR code]
    └──requires──> [NIP-46 bunker URI input]
    └──enhances──> [Editable relay field]

[nevent paste]
    └──enhances──> [Theme picker modal]

[Logout]
    └──requires──> [Login state persistence]

[GitHub footer link] ──independent (no dependencies)
[Background color fix] ──independent (no dependencies)
```

### Dependency Notes

- **NIP-07 login requires owner detection:** Login by itself is useless without the compare-pubkey-to-hostname logic that unlocks management UI. They ship together.
- **NIP-46 login requires bunker URI input:** The user must paste or type a bunker:// URI. The QR code path uses the same `NostrConnectSigner` but with the URI generated by the app instead.
- **Theme picker gates on login + owner detection:** A visitor must never see the publish button. Owner detection is the prerequisite; login is how owner detection is established.
- **Nsite edit/delete gate on login:** Publishing replacement or deletion events requires a signed event from the owner's signer. These features cannot function without an active signer instance.
- **Live preview uses existing `applyTheme()`:** The current `theme.ts` already handles DOM injection. The picker just needs to call `applyTheme()` speculatively and `clearTheme()` on dismiss — no new DOM logic needed.

---

## MVP Definition

### Launch With (v1 — this milestone)

Everything in the Active requirements list from PROJECT.md. No deferral.

- [x] GitHub link in footer — tiny effort, should not be deferred
- [x] Default background color fix — visual quality, easy
- [x] NIP-07 login — table stakes for owner access
- [x] NIP-46 login (bunker URI + nostrconnect QR + editable relay) — required for mobile/hardware signers in the nsite ecosystem; nsite config already references a bunkerPubkey
- [x] Owner detection gate — no management UI makes sense without this
- [x] Theme picker modal (curated + nevent paste + preview + publish as kind 16767) — the primary differentiating feature of this milestone
- [x] Nsite name/description edit (kind 35128 / kind 15128) — basic content management
- [x] Nsite deletion via NIP-09 — completing the management surface

### Add After Validation (v1.x)

Deferred until the management layer is live and real owners use it.

- [ ] Standalone theme picker package — extract after the component is proven in-app; premature extraction creates churn
- [ ] Theme picker search / relay discovery for kind 36767 — currently addressed by curated list + nevent paste; search adds relay query complexity

### Future Consideration (v2+)

These require validation that they belong in npub-home at all.

- [ ] Profile metadata (kind 0) editing — significant scope expansion; defer until it's clear this app is the right place
- [ ] Theme builder (custom color picker) — separate product scope; defer indefinitely

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| GitHub footer link | LOW | LOW | P1 — trivial, do it |
| Background color fix | MEDIUM | LOW | P1 — visible quality issue |
| NIP-07 login | HIGH | LOW | P1 — all other management features block on this |
| Owner detection | HIGH | LOW | P1 — gate for all management UI |
| Login persistence + logout | MEDIUM | LOW | P1 — implied by any login system |
| NIP-46 bunker URI + QR | HIGH | MEDIUM | P1 — nsite ecosystem uses bunkers natively |
| Editable relay field | MEDIUM | LOW | P1 — companion to NIP-46; low incremental cost |
| Nsite name/description edit | HIGH | MEDIUM | P1 — primary management action |
| Nsite deletion (NIP-09) | HIGH | MEDIUM | P1 — completes the management surface |
| Theme picker modal | HIGH | HIGH | P1 — primary differentiating feature of milestone |
| Live theme preview | HIGH | LOW | P1 — applyTheme() already exists; preview is just not-yet-committed application |
| nevent paste for themes | MEDIUM | LOW | P1 — low cost, high flexibility payoff |
| Theme picker as extractable component | MEDIUM | MEDIUM | P2 — architectural discipline during build, extraction deferred |

**Priority key:**
- P1: Must have for this milestone
- P2: Architectural goal, not a user-facing deliverable for this milestone
- P3: Future consideration

---

## Competitor Feature Analysis

There are no direct competitors to npub-home (an nsite-specific landing page manager). Closest analogues are:

| Feature | metadata.nostr.com | Ditto admin panel | npub-home (this project) |
|---------|-------------------|-------------------|--------------------------|
| NIP-07 login | Yes | Yes | Yes (this milestone) |
| NIP-46 login | No | Yes (via Soapbox Signer) | Yes (this milestone) |
| Profile theme editing | No | Yes (full color picker) | Picker only (curated + nevent), no builder |
| nsite management | No | Partial | Yes — primary feature |
| Visitor mode (no login needed) | No | No | Yes — core design |
| Extractable component | No | No | Theme picker as future package |

Key observation: no existing tool combines nsite management + theme picking in a single client-side SPA. This is new ground.

---

## Implementation Notes (for Roadmap)

### NIP-46 Login Complexity
The hardest part of NIP-46 login is the async connection handshake: `NostrConnectSigner.connect()` resolves only after the remote signer responds on the relay. The UI must show a pending/waiting state and handle timeout gracefully. The relay field must be editable before the connection URI is generated, then locked (or regenerated on change) once the QR code is shown.

### NIP-09 Deletion Caveats
NIP-09 deletion is a soft request — relays and clients are not required to honor it. The UI must communicate this clearly: "Request deletion" rather than "Delete." For addressable events (kind 35128), the deletion event should include both the `e` tag (event ID) and the `a` tag (kind:pubkey:d-tag) to maximize relay compliance. Publish the deletion to the same relays that received the original event.

### Theme Picker Kind Mapping
- **kind 36767**: Shareable/public theme definition. Published by theme creators (Ditto ecosystem). These are fetched and displayed in the curated list.
- **kind 16767**: Active profile theme for a specific pubkey. This is what the picker publishes when the owner selects a theme. The existing theme.ts already parses and applies kind 16767 events.
- The picker does NOT publish kind 36767 events — it only reads them and publishes kind 16767 as the active selection.

### Signing Architecture
Both NIP-07 and NIP-46 signers expose the same interface (getPublicKey, signEvent). The app should hold a single `signer` reference that is either an `ExtensionSigner` or `NostrConnectSigner` from applesauce-signers. All write operations (publish theme, edit nsite, delete nsite) pass through this signer reference — no feature should import the signer type directly.

### Publishing Write Events
The existing RelayPool can be used for publishing (`pool.publish(relays, event)`). The user's kind 10002 relay list should be the target for all published events — not just bootstrap relays. Fetch the user's outbox relays from the already-loaded EventStore before publishing.

---

## Sources

- NIP-07 specification: https://nips.nostr.com/7
- NIP-46 specification: https://nips.nostr.com/46
- NIP-09 specification: https://nips.nostr.com/9
- applesauce-signers documentation: https://applesauce.build/typedoc/modules/applesauce-signers.html
- NIP-5A (nsite) PR: https://github.com/nostr-protocol/nips/pull/1538
- nostr-login (reference implementation): https://github.com/nostrband/nostr-login
- Nostr UX patterns: https://nostr-ux.com/
- Nostr design challenges (deletion UX): https://nostrdesign.org/docs/unique-design-challenges/
- nostr-tools NIP-46: https://github.com/nbd-wtf/nostr-tools/blob/master/nip46.ts

---

*Feature research for: Nostr nsite management SPA — milestone adding login, owner management, and theme picker*
*Researched: 2026-04-09*
