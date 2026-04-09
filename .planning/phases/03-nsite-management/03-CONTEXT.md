# Phase 3: Nsite Management - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds owner-only nsite management capabilities: inline editing of nsite name and description (republishing kind 35128/15128 events), and NIP-09 deletion (publishing kind 5 events). These features are gated behind the owner detection from Phase 1 and use the same signer + write relay infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Edit UX
- Inline edit icon (pencil) next to each nsite entry, only visible when owner is logged in
- Clicking edit expands the nsite entry to show name/description input fields in place
- "Save" button + "Cancel" link appear below the inline fields
- On successful save: collapse back to view mode with updated values, brief success indicator

### Deletion UX
- Delete icon (trash) next to edit icon, owner-only visibility
- Confirmation before deletion: inline confirm with "Request deletion? This is best-effort." message
- Confirm shows "Delete" and "Cancel" buttons replacing the icons
- After deletion: remove from list immediately with brief "Deletion requested" indicator
- NIP-09: publish kind 5 event with both `e` tag (event ID) and `a` tag (for addressable events) via same signer + write relays

### Claude's Discretion
- Exact icon choices for edit/delete (unicode characters vs SVG, following existing arrow pattern)
- Loading states during save/delete operations
- Error handling for failed publish operations
- Whether edit and delete icons share a row or are stacked
- Styling of the inline edit form fields

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/auth.svelte.ts` — `signer` ($state), `isOwner()` getter for gating management UI
- `src/lib/nostr/store.ts` — `pool` (RelayPool) for publishing, `eventStore` (EventStore) for reading events
- `src/lib/nostr/loaders.ts` — `getNsitesFromStore()` returns NsiteEntry[] with slug, title, description, createdAt
- `src/lib/components/NsiteList.svelte` — current nsite list component, will need editing/delete UI added
- `src/lib/components/ThemePicker.svelte` — EventFactory + publish pattern to follow
- `src/routes/+page.svelte` — already passes writeRelays to ThemePicker; same pattern for nsite management

### Established Patterns
- EventFactory from applesauce-core for building events, signer.signEvent for signing, pool.publish for broadcasting
- Write relays resolved from kind 10002 via getOutboxes() in +page.svelte
- Svelte 5 runes, Tailwind utility classes, named exports, no style blocks

### Integration Points
- `src/lib/components/NsiteList.svelte` — primary component to modify (add edit/delete UI)
- `src/lib/nostr/loaders.ts` — may need to expose the raw NostrEvent alongside NsiteEntry for republishing
- `src/routes/+page.svelte` — pass isOwner, signer, writeRelays props to NsiteList

</code_context>

<specifics>
## Specific Ideas

- For editing: need the original NostrEvent to modify tags and republish. NsiteEntry currently only has parsed fields — may need to store the source event reference
- For NIP-09 deletion of addressable events (kind 35128): the kind 5 event should include both `["e", eventId]` and `["a", "35128:<pubkey>:<d-tag>"]` tags per NIP-09
- For kind 15128 (root nsite): similar pattern but no d-tag in the `a` tag
- The existing NsiteList.svelte is a simple display component — needs to become conditionally interactive when owner is logged in

</specifics>

<deferred>
## Deferred Ideas

- Reordering nsites on the page (v2)
- Creating new nsite entries (v2)

</deferred>
