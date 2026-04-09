# Phase 3: Nsite Management - Research

**Researched:** 2026-04-09
**Domain:** Svelte 5, NIP-09 deletion events, applesauce-core EventFactory, inline edit UX
**Confidence:** HIGH

## Summary

Phase 3 adds owner-only inline editing and NIP-09 deletion to the `NsiteList` component. The technical foundation is already proven: Phase 2 established the exact `EventFactory.build → factory.sign → pool.publish` pattern for writing Nostr events. Phase 3 reuses that pattern twice — once for republishing edited kind 35128/15128 events with updated metadata, and once for publishing kind 5 deletion events.

The key discovery is that `applesauce-core` ships a `setDeleteEvents` operation in `applesauce-core/operations/delete` that handles the full NIP-09 tag structure automatically. It detects whether the target event is addressable (kind 35128 → `isAddressableKind` returns true for 30000–40000) or replaceable (kind 15128 → `isReplaceableKind` returns true for 10000–20000) and adds the correct `e`, `a`, and `k` tags. There is no need to hand-roll NIP-09 tag construction.

The second key discovery is that `NsiteEntry` (in `loaders.ts`) currently strips the raw `NostrEvent` and only exposes parsed fields. Editing requires the original event to copy all tags and set a new `created_at`. The loader must be updated to expose the raw event reference alongside parsed fields, or a parallel lookup into `eventStore` must be performed at edit time. Exposing the event directly in `NsiteEntry` is simpler and avoids a second store query.

**Primary recommendation:** Extend `NsiteEntry` to carry a `sourceEvent: NostrEvent` field. Modify `NsiteList` to accept `isOwner`, `signer`, `pool`, and `writeRelays` props (same pattern as ThemePicker's props). Use `EventFactory.modify()` for editing and `EventFactory.build() + setDeleteEvents()` for deletion.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Edit UX**
- Inline edit icon (pencil) next to each nsite entry, only visible when owner is logged in
- Clicking edit expands the nsite entry to show name/description input fields in place
- "Save" button + "Cancel" link appear below the inline fields
- On successful save: collapse back to view mode with updated values, brief success indicator

**Deletion UX**
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

### Deferred Ideas (OUT OF SCOPE)
- Reordering nsites on the page (v2)
- Creating new nsite entries (v2)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NSITE-01 | Owner can edit the name of an existing nsite (republish kind 35128 or 15128 event with updated metadata) | EventFactory.modify() copies existing event, updates title tag, re-signs and publishes. Requires sourceEvent in NsiteEntry. |
| NSITE-02 | Owner can edit the description of an existing nsite (republish kind 35128 or 15128 event with updated metadata) | Same mechanism as NSITE-01 — both fields edited in the same inline form, saved in one publish. |
| NSITE-03 | Owner can request deletion of an nsite via NIP-09 (kind 5 deletion event) | applesauce-core `setDeleteEvents` operation builds the correct kind 5 with e+a+k tags automatically for both kind 35128 and kind 15128. |
| NSITE-04 | Deletion UI clearly communicates that deletion is best-effort/advisory | Inline confirm reads "Request deletion? This is best-effort." per locked decision. Label "Deletion requested" shows after publish, not "Deleted". |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| applesauce-core | 5.1.0 | EventFactory for building/signing events; `setDeleteEvents` operation for NIP-09 | Already in use in Phase 2 ThemePicker; ships `operations/delete` for kind 5 |
| applesauce-relay | 5.1.0 | `pool.publish` for broadcasting signed events | Already in use; same pool instance from store.ts |
| applesauce-signers | 5.2.0 | Signer passed as prop for signing events | Established in Phase 1/2; never imported directly in components |
| Svelte 5 | 5.51.0 | Runes ($state, $props, $derived) for reactive UI state | Project standard |
| Tailwind CSS | 4.x | Utility classes for inline edit form and icon buttons | Project standard; no style blocks |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nostr-tools (NostrEvent type) | 2.23.3 | Type import for sourceEvent field on NsiteEntry | Import as `type` only; no runtime dependency |
| @testing-library/svelte | 5.3.1 | Component tests for NsiteList edit/delete UI | All UI behavior tests |
| vitest | 4.1.4 | Test runner | Existing test infrastructure |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| EventFactory.modify() for edits | factory.build() with full tag reconstruction | modify() preserves unknown tags safely; build() risks dropping tags from the original event |
| setDeleteEvents() operation | Hand-roll `e` + `a` tags manually | setDeleteEvents handles replaceable/addressable detection automatically; hand-roll risks missing `k` tag or `a` tag for kind 15128 |
| Inline edit in NsiteList | Separate EditNsite modal component | Inline is the locked UX decision; avoid extracting to modal |

**Installation:** No new packages required. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure

No new files are required beyond modifying existing ones. The additions are:

```
src/
├── lib/
│   ├── nostr/
│   │   └── loaders.ts         — extend NsiteEntry with sourceEvent: NostrEvent
│   └── components/
│       └── NsiteList.svelte   — add isOwner, signer, pool, writeRelays props + edit/delete UI
└── routes/
    └── +page.svelte           — pass isOwner(), getSigner()!, pool, writeRelays to NsiteList
```

A new test file is required:

```
src/lib/__tests__/
└── NsiteList.test.ts          — tests for NSITE-01 through NSITE-04
```

### Pattern 1: Extending NsiteEntry with sourceEvent

**What:** Add an optional `sourceEvent?: NostrEvent` field to `NsiteEntry`. Populate it in `getNsitesFromStore()` when building each entry.

**When to use:** Required for edit (need original tags to copy) and delete (need event.id and event.kind for NIP-09 tags).

**Example:**
```typescript
// src/lib/nostr/loaders.ts
import type { NostrEvent } from 'nostr-tools';

export interface NsiteEntry {
  slug?: string;
  createdAt: number;
  title?: string;
  description?: string;
  sourceEvent?: NostrEvent;  // ADD: raw event for edit/delete operations
}

// In getNsitesFromStore, when pushing an entry:
nsites.push({
  slug: dTag,
  createdAt: event.created_at,
  title: event.tags.find((t) => t[0] === 'title')?.[1],
  description: event.tags.find((t) => t[0] === 'description')?.[1],
  sourceEvent: event,  // ADD
});
```

### Pattern 2: NsiteList Props Extension

**What:** NsiteList receives management props when owner is logged in, following the ThemePicker props pattern.

**When to use:** Owner-only UI is gated by `isOwner` prop, not by importing auth singleton.

**Example:**
```typescript
// src/lib/components/NsiteList.svelte
import type { RelayPool } from 'applesauce-relay';
import type { EventSigner } from 'applesauce-core/event-factory';

let {
  nsites,
  host,
  pubkey,
  isOwner = false,
  signer,
  pool,
  writeRelays = [],
}: {
  nsites: NsiteEntry[];
  host: string;
  pubkey: string;
  isOwner?: boolean;
  signer?: EventSigner;
  pool?: RelayPool;
  writeRelays?: string[];
} = $props();
```

In `+page.svelte`, pass props when owner:
```svelte
<NsiteList
  {nsites}
  {host}
  {pubkey}
  isOwner={isOwner()}
  signer={getSigner() ?? undefined}
  {pool}
  {writeRelays}
/>
```

### Pattern 3: Editing — EventFactory.modify()

**What:** `factory.modify(sourceEvent, ...operations)` copies the event, applies operations (tag changes, updated `created_at`), stamps the signer pubkey, and returns an `EventTemplate` ready for signing.

**When to use:** Republishing kind 35128 or kind 15128 with updated title/description.

**Example:**
```typescript
// Source: applesauce-core/dist/event-factory/event-factory.d.ts
import { EventFactory } from 'applesauce-core/event-factory';
import { BOOTSTRAP_RELAYS } from '$lib/nostr/bootstrap';

async function saveEdit(nsite: NsiteEntry, newTitle: string, newDesc: string) {
  if (!nsite.sourceEvent || !signer || !pool) return;
  saving = true;
  saveError = null;
  try {
    const factory = new EventFactory({ signer });
    // modify() updates created_at automatically and applies operations
    const template = await factory.modify(nsite.sourceEvent, (draft) => {
      // Replace title and description tags; preserve all other tags
      const otherTags = draft.tags.filter(
        (t) => t[0] !== 'title' && t[0] !== 'description'
      );
      const newTags = [
        ...otherTags,
        ...(newTitle ? [['title', newTitle]] : []),
        ...(newDesc ? [['description', newDesc]] : []),
      ];
      return { ...draft, tags: newTags };
    });
    const signed = await factory.sign(template);
    const targets = writeRelays.length > 0 ? writeRelays : BOOTSTRAP_RELAYS;
    await pool.publish(targets, signed);
    // collapse edit mode, update local title/description display
  } catch {
    saveError = 'Failed to save. Check your connection and try again.';
  } finally {
    saving = false;
  }
}
```

### Pattern 4: Deletion — setDeleteEvents() operation

**What:** `setDeleteEvents([event])` is an `EventOperation` that adds the correct `e`, `a`, and `k` tags to a kind 5 event for NIP-09. For addressable events (kind 35128, range 30000-40000) it adds the `a` tag via `getAddressPointerForEvent`. For replaceable events (kind 15128, range 10000-20000) it also adds the `a` tag.

**When to use:** Any NIP-09 deletion of an nsite event.

**Example:**
```typescript
// Source: applesauce-core/dist/operations/delete.js (verified)
import { EventFactory } from 'applesauce-core/event-factory';
import { setDeleteEvents } from 'applesauce-core/operations/delete';
import { BOOTSTRAP_RELAYS } from '$lib/nostr/bootstrap';

async function requestDeletion(nsite: NsiteEntry) {
  if (!nsite.sourceEvent || !signer || !pool) return;
  deleting = true;
  deleteError = null;
  try {
    const factory = new EventFactory({ signer });
    const template = await factory.build(
      { kind: 5, content: '' },
      setDeleteEvents([nsite.sourceEvent])
    );
    const signed = await factory.sign(template);
    const targets = writeRelays.length > 0 ? writeRelays : BOOTSTRAP_RELAYS;
    await pool.publish(targets, signed);
    // remove from list immediately; show brief "Deletion requested" indicator
  } catch {
    deleteError = 'Failed to request deletion. Check your connection and try again.';
  } finally {
    deleting = false;
  }
}
```

### Pattern 5: Per-Entry Inline State

**What:** Each nsite row needs its own edit/confirm-delete state. Use per-entry `$state` variables keyed by slug (or index).

**When to use:** Multiple rows can be independently in edit or confirm-delete mode.

**Example:**
```typescript
// Map from nsite identifier to UI mode — use $state for reactivity
type RowMode = 'view' | 'editing' | 'confirm-delete' | 'deleting' | 'saving';
let rowModes = $state<Record<string, RowMode>>({});

function nsiteKey(nsite: NsiteEntry): string {
  return nsite.slug ?? '__root__';
}

function setMode(nsite: NsiteEntry, mode: RowMode) {
  rowModes = { ...rowModes, [nsiteKey(nsite)]: mode };
}
```

Edit input values can be per-entry `$state` objects initialized from the nsite entry on edit open.

### Anti-Patterns to Avoid

- **Importing auth singleton in NsiteList:** Never import `isOwner`, `getSigner`, or `signer` from `$lib/auth.svelte` inside `NsiteList.svelte`. Receive them as props. This maintains the extractable-component pattern from Phase 2.
- **Mutating NsiteEntry in place:** Do not update `nsite.title` / `nsite.description` locally after a save. The eventStore reactive subscription in `+page.svelte` will re-derive `nsites` from the new event after it arrives back from the relay; the list will update itself.
- **Publishing with factory.build() for edits:** Using `build()` starts from a blank template, losing unknown tags. Use `modify()` which starts from the existing event.
- **Hand-rolling kind 5 tags:** Do not manually construct `["e", id]` and `["a", "35128:pubkey:d-tag"]` — use `setDeleteEvents([sourceEvent])` which handles both replaceable and addressable kinds correctly and adds the `k` tag.
- **async onMount with cleanup return:** Phase 1 learned that `async onMount` conflicts with Svelte's cleanup return. Use `.then()` inside synchronous `onMount` if async work is needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| NIP-09 kind 5 tag structure | Custom `["e", id]` + `["a", "35128:pubkey:d-tag"]` construction | `setDeleteEvents([sourceEvent])` from `applesauce-core/operations/delete` | Handles `e`, `a`, and `k` tags; detects addressable vs replaceable automatically; battle-tested |
| Event modification with updated timestamp | Clone event and mutate tags manually | `EventFactory.modify(sourceEvent, operation)` | Sets `created_at` automatically; preserves unknown tags; consistent with codebase pattern |
| Determining if event is addressable | Manual kind range check | `isAddressableKind(kind)` / `isReplaceableKind(kind)` from nostr-tools | Already used by setDeleteEvents internally |

**Key insight:** The applesauce-core operations layer exists precisely to handle these Nostr protocol edge cases. Using it keeps the component code thin and correct.

---

## Common Pitfalls

### Pitfall 1: NsiteEntry Lacks sourceEvent — Edit/Delete Silently Fails
**What goes wrong:** Edit and delete operations require the original `NostrEvent` (for its `id`, `kind`, `pubkey`, and full `tags` array). Without it, the operation cannot be performed and must be skipped or will error.
**Why it happens:** `getNsitesFromStore()` currently strips the raw event to a parsed `NsiteEntry`. This was fine for display-only use.
**How to avoid:** Add `sourceEvent?: NostrEvent` to `NsiteEntry` and populate it in `getNsitesFromStore()` for both kind 35128 and kind 15128 entries.
**Warning signs:** TypeScript errors when accessing `nsite.sourceEvent` — means the field wasn't added to the interface.

### Pitfall 2: Edit Races With eventStore Reactive Update
**What goes wrong:** After a successful save, the `nsiteSub` in `+page.svelte` will re-derive `nsites` when the published event arrives back from relays. This causes the `nsites` prop to NsiteList to change, which resets all row state. If the user double-clicks Save, a second publish fires.
**Why it happens:** The reactive subscription fires on any matching event, including the one we just published.
**How to avoid:** Set `saving = true` and disable Save during publish. On success, immediately collapse to view mode (so there's no stale state to reset). The prop update from +page is benign once row mode is already 'view'.

### Pitfall 3: Deletion "Removes Immediately" Before eventStore Reflects It
**What goes wrong:** The locked UX says "remove from list immediately after deletion." But the `nsiteSub` reactive subscription derives the list from `eventStore` — it will not remove the entry until a deletion event causes the relay to stop returning the original event (which may take time or may never happen on all relays).
**Why it happens:** NIP-09 deletion is advisory/best-effort. Relays may not honor it. The eventStore reflects what relays return.
**How to avoid:** Maintain a local `deletedSlugs = $state<Set<string>>(new Set())` in NsiteList. After a successful deletion publish, add the nsite's key to this set and filter it out of the rendered list. The label "Deletion requested" (not "Deleted") satisfies NSITE-04 honesty requirement.

### Pitfall 4: kind 15128 Root Nsite Has No d-tag
**What goes wrong:** Root nsite (kind 15128) has no slug/d-tag. Row state keying by `nsite.slug` breaks for the root entry.
**Why it happens:** The kind 15128 event is replaceable, not addressable — it has no `d` tag.
**How to avoid:** Use `nsite.slug ?? '__root__'` as the row key everywhere. For the `a` tag in deletion, `setDeleteEvents` handles this correctly since it calls `getAddressPointerForEvent` which returns null for events without a d-tag when the kind is not addressable (kind 15128 is replaceable, not addressable — no d-tag needed in the `a` coordinate).

**Clarification on kind 15128 `a` tag for deletion:**
- kind 15128 is in range 10000-20000 → `isReplaceableKind` = true
- `setDeleteEvents` calls `isAddressableKind || isReplaceableKind` — both trigger `a` tag inclusion
- `getAddressPointerForEvent` for kind 15128 returns `{ kind: 15128, pubkey, identifier: '' }` (empty identifier, no d-tag)
- The resulting `a` tag is `["a", "15128:<pubkey>:"]` which is correct for replaceable events

### Pitfall 5: NsiteList Becomes Non-Extractable if It Imports Singletons
**What goes wrong:** Importing `pool`, `signer`, or `isOwner` from singletons inside NsiteList violates the Phase 2 architectural decision about extractable components.
**Why it happens:** It's convenient but creates hidden dependencies.
**How to avoid:** All management dependencies come in as props. NsiteList must not import from `$lib/nostr/store` or `$lib/auth.svelte`. A test (like THEME-06's static source check) should verify this.

---

## Code Examples

Verified patterns from official sources:

### setDeleteEvents — verified source

```typescript
// Source: applesauce-core/dist/operations/delete.js (local node_modules, verified)
// The operation adds e, a (for addressable/replaceable), and k tags automatically.
import { setDeleteEvents } from 'applesauce-core/operations/delete';

const factory = new EventFactory({ signer });
const template = await factory.build(
  { kind: 5, content: '' },
  setDeleteEvents([sourceEvent])  // sourceEvent is the NostrEvent being deleted
);
const signed = await factory.sign(template);
await pool.publish(targets, signed);
```

### EventFactory.modify — verified source

```typescript
// Source: applesauce-core/dist/event-factory/event-factory.d.ts (local node_modules, verified)
// modify() = modifyEvent(draft, context, ...operations)
// Sets created_at to Date.now() automatically; preserves all existing tags unless operation changes them.
const factory = new EventFactory({ signer });
const template = await factory.modify(sourceEvent, (draft) => ({
  ...draft,
  tags: [
    ...draft.tags.filter((t) => t[0] !== 'title' && t[0] !== 'description'),
    ['title', newTitle],
    ['description', newDesc],
  ],
}));
const signed = await factory.sign(template);
await pool.publish(targets, signed);
```

### Per-entry row state pattern (Svelte 5)

```typescript
// Svelte 5 $state with object spread for immutable update
let rowModes = $state<Record<string, 'view' | 'editing' | 'confirm-delete' | 'saving' | 'deleting'>>({});
let editValues = $state<Record<string, { title: string; description: string }>>({});

function openEdit(nsite: NsiteEntry) {
  const key = nsite.slug ?? '__root__';
  editValues = { ...editValues, [key]: { title: nsite.title ?? '', description: nsite.description ?? '' } };
  rowModes = { ...rowModes, [key]: 'editing' };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-roll kind 5 e+a tags | `setDeleteEvents` operation from applesauce-core | applesauce-core 5.x | Reduces tag construction errors; handles replaceable + addressable automatically |
| `factory.build()` for event edits | `factory.modify()` for event edits | applesauce-core 5.x | modify() preserves unknown tags and sets created_at; build() does not |

---

## Open Questions

1. **Does `EventFactory.modify()` update `created_at` automatically?**
   - What we know: The `.d.ts` says "Modify an existing event with operations and **updated the created_at**" — strong indication it does.
   - What's unclear: The exact value (Date.now() vs original + 1).
   - Recommendation: Treat as confirmed from documentation wording. If tests show otherwise, set `created_at` explicitly in the operation.

2. **Will `getAddressPointerForEvent` return null for kind 15128 (no d-tag)?**
   - What we know: `isReplaceableKind(15128)` = true; `isAddressableKind(15128)` = false. `setDeleteEvents` calls `getAddressPointerForEvent` when either is true. For replaceable events, the pointer identifier is the empty string.
   - What's unclear: Whether `getAddressPointerForEvent` returns `null` or `{ kind: 15128, pubkey, identifier: '' }` for a replaceable event with no d-tag.
   - Recommendation: Verify in Wave 0 unit test. If it returns null, `setDeleteEvents` skips the `a` tag — which is acceptable for kind 15128 since the `e` tag alone is sufficient for deletion.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified — this is a code/component change only; all tools and runtimes are already confirmed by Phases 1 and 2)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run src/lib/__tests__/NsiteList.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NSITE-01 | Save button calls EventFactory.modify + pool.publish with updated title tag | unit | `npx vitest run src/lib/__tests__/NsiteList.test.ts` | ❌ Wave 0 |
| NSITE-02 | Save button publishes with updated description tag | unit | `npx vitest run src/lib/__tests__/NsiteList.test.ts` | ❌ Wave 0 |
| NSITE-03 | Delete confirm calls EventFactory.build + setDeleteEvents + pool.publish | unit | `npx vitest run src/lib/__tests__/NsiteList.test.ts` | ❌ Wave 0 |
| NSITE-04 | "Request deletion? This is best-effort." text appears in delete confirm UI | unit | `npx vitest run src/lib/__tests__/NsiteList.test.ts` | ❌ Wave 0 |
| Arch | NsiteList has zero imports from $lib/nostr/store and $lib/auth.svelte | static | `npx vitest run src/lib/__tests__/NsiteList.test.ts` | ❌ Wave 0 |
| Regression | All 50 existing tests continue to pass | regression | `npx vitest run` | ✅ |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/__tests__/NsiteList.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green (50 + new NsiteList tests) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/NsiteList.test.ts` — covers NSITE-01, NSITE-02, NSITE-03, NSITE-04, and arch singleton check

*(No framework gaps — existing vitest infrastructure is complete)*

---

## Sources

### Primary (HIGH confidence)
- Local `node_modules/applesauce-core/dist/operations/delete.js` — `setDeleteEvents` implementation verified; handles `e`, `a` (for addressable+replaceable), and `k` tags
- Local `node_modules/applesauce-core/dist/event-factory/event-factory.d.ts` — `modify()` signature and docstring "updated the created_at" verified
- Local `node_modules/nostr-tools/lib/esm/kinds.js` — `isAddressableKind` (30000-40000), `isReplaceableKind` (10000-20000) range verified
- `src/lib/components/ThemePicker.svelte` — established EventFactory.build + sign + publish pattern (Phase 2)
- `src/lib/nostr/loaders.ts` — current NsiteEntry interface; getNsitesFromStore() implementation
- `src/lib/components/NsiteList.svelte` — current display-only component to be extended
- `src/lib/__tests__/ThemePicker.test.ts` — established test patterns for mocking EventFactory, pool, signer

### Secondary (MEDIUM confidence)
- `applesauce-core/dist/helpers/pointers.d.ts` — `getAddressPointerForEvent` returns `AddressPointer | null`; null handling in setDeleteEvents verified by reading the source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use; versions confirmed from package.json
- Architecture: HIGH — patterns verified directly from installed applesauce-core source + Phase 2 codebase
- Pitfalls: HIGH — derived from reading actual implementation code, not documentation assumptions
- NIP-09 tag construction: HIGH — setDeleteEvents verified from local node_modules source

**Research date:** 2026-04-09
**Valid until:** 2026-06-01 (applesauce-core stable API; Svelte 5 runes API stable)
