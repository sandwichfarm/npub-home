# Pitfalls Research

**Domain:** Nostr SPA with remote signing, event publishing, and nsite management
**Researched:** 2026-04-09
**Confidence:** MEDIUM — NIP-46 is a live, frequently-revised spec; relay behavior varies; findings from official NIP docs, nostr-tools source, and community interop tracking.

---

## Critical Pitfalls

### Pitfall 1: NIP-46 Three-Keypair Confusion

**What goes wrong:**
The developer conflates the client keypair (ephemeral, used to encrypt NIP-46 messages), the remote-signer keypair (the bunker's identity), and the user's actual signing keypair. Code assumes `bunker.pubkey` is the user's pubkey, so events get attributed to the wrong identity or signature verification fails silently.

**Why it happens:**
The bunker URI contains the remote-signer's pubkey, not the user's. nostr-tools' `BunkerSigner` requires an explicit `getPublicKey()` call after `connect()` to retrieve the actual user pubkey. Developers skip this step and read the pubkey from the URI directly.

**How to avoid:**
Always call `await bunker.getPublicKey()` after a successful `connect()`. Never use the pubkey parsed from the `bunker://` URI as the signing identity for events. Keep client secret key ephemeral (generate fresh per session, never persist).

**Warning signs:**
- Events appear to publish successfully but fail relay signature checks
- Owner detection (`loggedInPubkey === sitePubkey`) never becomes true even after login
- Profile data doesn't match the logged-in identity

**Phase to address:**
Login / signer integration phase (before any write operations are attempted)

---

### Pitfall 2: Stale NIP-46 Replies from Non-Compliant Relays

**What goes wrong:**
Kind 24133 events are ephemeral (NIP-16), but many strfry and general-purpose relays do not actually delete them. When the client subscribes for bunker responses, the relay delivers old replies from previous sessions. The client processes a stale response, marks the connection as established with wrong data, or ignores the real response that arrives afterward.

**Why it happens:**
Relay non-compliance with ephemeral event deletion is common. Without a `since` filter, the subscription receives everything the relay has stored, not just the current session's messages.

**How to avoid:**
Always subscribe with `since: Math.floor(Date.now() / 1000) - 10` when opening the NIP-46 reply subscription. Also deduplicate on the RPC `id` field — only process the first response per request ID and discard subsequent duplicates. Discard duplicate `auth_url` messages; only the first per method call is valid.

**Warning signs:**
- Login appears to succeed but then immediately fails or re-prompts
- `connect()` resolves but `getPublicKey()` returns an unexpected value
- QR code flow seems to complete instantly without user scanning

**Phase to address:**
Login / NIP-46 implementation phase

---

### Pitfall 3: General-Purpose Relays Rate-Limiting NIP-46 Traffic

**What goes wrong:**
NIP-46 uses rapid-fire kind 24133 events. General-purpose relays enforce EVENT rate limits that are appropriate for regular content but too low for signing RPC traffic. The bunker connection appears to work for simple operations but timeouts or drops requests under load (e.g., signing multiple nsite edit events in sequence).

**Why it happens:**
Developers test on their own relay or a well-provisioned one, then deploy to a standard relay that rejects rapid EVENT publishing. The default timeout in nostr-tools `BunkerSigner.fromURI()` is 300 seconds, masking the issue during development.

**How to avoid:**
Use dedicated NIP-46 relay infrastructure (e.g., relay.nsec.app, bunker.nsecbunker.com) rather than general relays. Make the relay field in the bunker connection UI editable so users can specify their own. Set an explicit `timeout` on signing operations (10–30 seconds for interactive use) so failures surface quickly.

**Warning signs:**
- Signing works once, fails on second sequential operation
- Operations timeout only on specific relays
- Works in dev, breaks in production on a different relay

**Phase to address:**
Login phase; revisit during nsite management (write operations) phase

---

### Pitfall 4: Publishing Events to the Wrong Relays (Missing Outbox Model)

**What goes wrong:**
After signing a theme or nsite event, the app publishes only to bootstrap relays (or the hardcoded relay list) rather than the user's own write relays from their NIP-65 kind 10002 list. The event is signed and broadcast, but most relays that other clients use to read this user's data never receive it. The user sees their change "succeed" but it doesn't propagate.

**Why it happens:**
The existing read path fetches from both bootstrap relays and discovered user relays. The write path is new and developers default to "publish to the same relays I read from" rather than specifically targeting the user's write relays from kind 10002.

**How to avoid:**
Before publishing any event, read the user's kind 10002 relay list from the already-populated `eventStore`. Publish to all relays tagged as write (or untagged, per NIP-65). If no kind 10002 is available, fall back to bootstrap relays. This relay list is already in the event store from the initial subscription.

**Warning signs:**
- Theme changes or nsite edits visible on current device but not on other clients
- Event shows as published but doesn't appear when fetching from the user's primary relays
- Discrepancy between what the app shows (local event store) and what remote clients see

**Phase to address:**
Any phase introducing write operations (theme publisher, nsite editor, deletion)

---

### Pitfall 5: NIP-09 Deletion Is Not Deletion

**What goes wrong:**
The app publishes a NIP-09 kind 5 deletion event and treats the nsite as gone — removes it from the UI immediately, makes no further effort. On any relay that does not honor deletion requests, the original kind 35128 event persists. Other clients (and this app after a cache clear) re-fetch and re-display the "deleted" nsite.

**Why it happens:**
NIP-09 is advisory: relays SHOULD delete referenced events, but are not required to. Client-side validation of deletion requires every client to check for kind 5 events and honor them. Many relays and clients do not.

**How to avoid:**
After publishing the deletion event, also optimistically hide the entry in the local event store. Inform the user that deletion is best-effort and may not propagate to all relays. Do not remove entries from the UI based solely on publish success of the kind 5 event — remove them when the kind 5 event is confirmed in the local store. Subscribe to kind 5 events for the user's pubkey in the initial fetch so previously-deleted nsites are correctly filtered on load.

**Warning signs:**
- Deleted nsites reappear after page refresh
- Deleted nsites visible on other devices
- Kind 5 events not included in the bootstrap relay subscription filter

**Phase to address:**
Nsite management (deletion) phase

---

### Pitfall 6: Replaceable Event Timestamp Collision on Sequential Edits

**What goes wrong:**
Two nsite edit operations submitted within the same second produce events with identical `created_at` timestamps. Relays and the local event store both use `created_at` to determine which version wins for replaceable events (kind 35128 uses the `d` tag as the unique key). The second publish silently overwrites or gets discarded depending on relay ordering, leaving the user in an inconsistent state.

**Why it happens:**
`created_at` is set to `Math.floor(Date.now() / 1000)`, which has 1-second resolution. Rapidly submitting two edits (e.g., editing name then description without waiting) hits this edge case.

**How to avoid:**
Debounce or serialize write operations. If multiple edits are pending for the same nsite, batch them into one event rather than publishing sequentially. After each publish, wait for relay confirmation (OK message) before enabling further edits to the same event.

**Warning signs:**
- Edit appears to succeed but old value returns on refresh
- Local event store shows correct value but relay returns stale version

**Phase to address:**
Nsite management (edit) phase

---

### Pitfall 7: Theme Picker as a Tightly-Coupled Singleton

**What goes wrong:**
The theme picker is implemented as a Svelte component that directly imports `eventStore`, `pool`, and the signer from module-scope globals. When the time comes to extract it as a standalone package, these imports are hardwired and there is no way to inject the store or signer from outside. Extraction requires a significant rewrite.

**Why it happens:**
The existing codebase uses module-scope singletons for `eventStore` and `pool` (see `src/lib/nostr/store.ts`). It is natural and convenient to import these directly inside any new component. The anti-pattern already exists and will be copied.

**How to avoid:**
Design the theme picker to accept its dependencies through props or Svelte context:
- The signer (NIP-07 or NIP-46) passed as a prop implementing a common `EventSigner` interface
- The event store or theme list passed as a reactive prop, not imported directly
- Publish callback passed as a prop rather than calling `pool.publish()` directly

Define a clean component API boundary before writing any implementation code. Use applesauce-core's `EventSigner` interface as the typing for the signer prop.

**Warning signs:**
- Theme picker component file contains `import { pool } from '$lib/nostr/store'`
- Theme picker component file contains `import { eventStore } from '$lib/nostr/store'`
- No props defined for data inputs; all data comes from module-level imports

**Phase to address:**
Theme picker phase (enforce during initial component design, before implementation)

---

### Pitfall 8: Login State Not Surviving Page Navigation or Component Re-mount

**What goes wrong:**
The signer instance (NIP-07 wrapper or NIP-46 `BunkerSigner`) is created inside a Svelte component's `onMount`. When the user navigates away or the component unmounts and remounts, the signer is destroyed and recreated. The NIP-46 `BunkerSigner` cannot be reused after `close()` — a new instance must be constructed. If the bunker pointer is not persisted (e.g., localStorage), the user must re-authenticate on every page load.

**Why it happens:**
Developers scope signer state to the component lifecycle. The `BunkerSigner` docs note that a closed signer cannot be reused, but the re-construction path requires re-doing the full `connect()` flow unless the `BunkerPointer` was stored.

**How to avoid:**
Store signer state (and for NIP-46, the serialized `BunkerPointer`) at module scope or in a Svelte store, not inside a component. On mount, check for a persisted `BunkerPointer` in localStorage and reconstruct the `BunkerSigner` directly via `fromBunker()` rather than re-doing the full QR/URI flow. Provide explicit logout that clears stored state.

**Warning signs:**
- Login prompt re-appears after a hard refresh despite "remembering" login
- Owner controls (theme picker, edit/delete buttons) disappear on navigation
- New `BunkerSigner.fromURI()` call triggered on every page load

**Phase to address:**
Login phase

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Import `eventStore` directly inside theme picker | Saves prop-drilling | Blocks package extraction; couples component to app's store instance | Never for the theme picker specifically |
| Hardcode bootstrap relays for publishing | Simple, no extra query | Events miss user's primary relays; writes don't propagate | Never for user-facing write operations |
| Skip `since` filter on NIP-46 subscription | Slightly simpler code | Stale relay replies cause ghost connections and auth loops | Never |
| Optimistic UI without awaiting relay OK | Feels fast | Shows success when relay rejected event; user confusion | Only for non-critical display updates, not writes |
| Use NIP-07 only, defer NIP-46 | Simpler auth path for MVP | Users without browser extension (mobile, Amber) can't log in | Acceptable as a phased rollout if clearly documented |
| Store BunkerPointer in sessionStorage | Avoids persistent credentials | User must re-authenticate on every tab open | Acceptable compromise vs. localStorage for security-conscious users |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| NIP-46 BunkerSigner | Calling `bunker.pubkey` as user pubkey | Call `await bunker.getPublicKey()` after connect |
| NIP-46 relay subscription | No `since` filter on kind 24133 subscription | Add `since: now - 10` to filter on relay subscription |
| NIP-46 BunkerSigner | Calling `fromURI()` on every page load | Persist `BunkerPointer`; use `fromBunker()` for reconnect |
| NIP-07 (window.nostr) | Checking `window.nostr` synchronously on page load | Check inside `onMount` or after a tick; extension injects asynchronously |
| NIP-65 write relay selection | Publishing to read relays or bootstrap relays | Filter kind 10002 `r` tags for `write` marker (or no marker) |
| NIP-09 deletion | Treating relay acknowledgment as proof of deletion | Show advisory UX; filter kind 5 events on read path too |
| applesauce-core EventStore | Using `.getByFilters()` inside subscription callback | Use events passed to callback directly to avoid re-query overhead (existing bug in +page.svelte line 61) |
| nostrconnect:// QR code | QR encodes the full URI including relay | Relay field changes must regenerate the URI and the QR code in sync |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| NIP-46 timeout too long | App hangs 5 minutes waiting for user to scan QR | Set `maxWaitOrAbort` to 60–120 seconds for interactive flows | Immediately on slow/absent signer response |
| Publishing to all relays in pool | Slow write operations, rate-limit errors | Publish only to user's NIP-65 write relays | As relay list grows past 5–10 relays |
| Re-fetching themes on every event in store | Flickering theme application, redundant parses | Use events passed by subscription callback, not re-query | On any relay delivering bursts of events |
| No debounce on nsite edit publish | Duplicate or colliding events from fast typists | Debounce publish by ≥1 second; serialize sequential writes | On any fast edit sequence |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Persisting client private key from NIP-46 session | Compromise of the app gives attacker decryption of all past NIP-46 messages | Generate ephemeral client keypair per session; do not persist |
| Accepting `bunker://` URI without validating secret on connect response | Session hijacking via crafted bunker URI | Validate the `secret` field in the `connect` response matches the URI's secret |
| Allowing connections without a secret via non-auth_url path | Attacker can impersonate bunker by racing the connection | For connections without secrets, only proceed after `auth_url` confirmation |
| CSS injection via theme font.family from kind 16767 | Stylesheet breakout via crafted font name | Sanitize `font.family` to alphanumeric + spaces before CSS injection (existing concern in CONCERNS.md) |
| Publishing kind 16767 theme event to read relays | Theme visible to aggregators but not applied by user's clients | Follow NIP-65 outbox: publish only to user's write relays |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading state during NIP-46 connection | User stares at blank button, re-clicks, creates duplicate connections | Show connecting spinner with timeout countdown and cancel option |
| QR code and relay field out of sync | User scans stale QR after editing relay field, connection fails | Regenerate URI and QR code reactively on any relay field change |
| No feedback when event publish fails | User thinks nsite was renamed/deleted, data is stale | Show explicit success/failure per relay with retry option |
| Showing "delete" option without deletion caveat | User surprised when deleted nsite reappears elsewhere | Label as "request deletion" with tooltip explaining relay propagation |
| Login visible to all visitors | Confusing for non-owners who will never use it | Login link only appears in footer, never in content area; owner controls shown only after pubkey match confirmed |
| No distinction between owner pubkey mismatch and "not logged in" | User confused why controls don't appear | Separate state for "not logged in" vs "logged in as different user" |

---

## "Looks Done But Isn't" Checklist

- [ ] **NIP-46 login:** Appears to connect but hasn't called `getPublicKey()` — verify owner detection actually uses the returned pubkey, not the bunker URI pubkey
- [ ] **Theme publisher:** Publishes to `pool` with all relays — verify it reads NIP-65 kind 10002 write relays from `eventStore` before publishing
- [ ] **Nsite deletion:** Publish succeeds — verify kind 5 events are in the initial relay subscription filter so deletions persist across refreshes
- [ ] **Nsite edit:** Single edit works — verify two sequential edits to the same event don't produce timestamp collisions
- [ ] **NIP-46 reconnect:** Works on first login — verify subsequent page loads reconstruct the signer from persisted `BunkerPointer` without repeating the QR flow
- [ ] **Theme picker isolation:** Renders correctly in app — verify the component has no direct imports of `pool`, `eventStore`, or any app-specific singleton
- [ ] **QR code flow:** QR appears — verify relay field edits update the QR code and URI reactively before the user scans
- [ ] **Owner detection:** Shows controls after login — verify controls also hide when user logs out (signer state cleared)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Three-keypair confusion discovered post-merge | HIGH | Audit all `pubkey` references post-connect; add explicit `getPublicKey()` assertion in login flow |
| Theme picker tightly coupled when extraction is requested | HIGH | Refactor to props-based API; break into sub-components accepting signer as prop |
| Events published to wrong relays | MEDIUM | Re-publish to correct relay set; add NIP-65 write relay resolution before any publish call |
| NIP-46 stale relay replies causing ghost connections | LOW | Add `since` filter to bunker subscription; clear persisted BunkerPointer to force re-auth |
| NIP-09 deletion not propagating | LOW | User-facing: inform the user deletion is best-effort; technical: no recovery, by design |
| Timestamp collision on edit | LOW | Serialize writes; add 1-second delay between sequential publishes to same event kind |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Three-keypair confusion (Pitfall 1) | Login / signer integration | Owner detection uses `getPublicKey()` return, confirmed by test with bunker |
| Stale NIP-46 replies (Pitfall 2) | Login / NIP-46 implementation | `since` filter present in all kind 24133 subscriptions |
| Rate-limiting on general relays (Pitfall 3) | Login phase; revisit in write phases | Relay field is user-editable; explicit timeout configured |
| Wrong relay for publishing (Pitfall 4) | First write operation phase (theme or nsite edit) | Publish logic reads NIP-65 kind 10002 write relays from store |
| NIP-09 non-deletion (Pitfall 5) | Nsite deletion phase | Kind 5 included in bootstrap subscription; deletion labeled as best-effort in UI |
| Replaceable event timestamp collision (Pitfall 6) | Nsite edit phase | Sequential edit test within 1-second window; debounce in place |
| Theme picker tight coupling (Pitfall 7) | Theme picker phase — enforce at design time | Component has no imports of app singletons; signer and data passed as props |
| Login state not surviving remount (Pitfall 8) | Login phase | BunkerPointer persisted in localStorage; reconnect path tested on hard refresh |

---

## Sources

- NIP-46 specification: https://github.com/nostr-protocol/nips/blob/master/46.md
- nostr-tools BunkerSigner source: https://github.com/nbd-wtf/nostr-tools/blob/master/nip46.ts
- NostrConnect interop tracker (community): https://github.com/nostrability/nostrability/issues/73
- Nostrify NIP-46 signer docs: https://nostrify.dev/sign/connect
- NIP-09 deletion spec: https://nips.nostr.com/9
- NIP-65 outbox model: https://nips.nostr.com/65
- Nostrify outbox model guide: https://nostrify.dev/relay/outbox
- Project codebase concerns audit: `.planning/codebase/CONCERNS.md`

---
*Pitfalls research for: Nostr nsite management SPA (npub-home)*
*Researched: 2026-04-09*
