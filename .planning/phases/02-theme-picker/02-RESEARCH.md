# Phase 2: Theme Picker - Research

**Researched:** 2026-04-09
**Domain:** Svelte 5 component architecture, Nostr kind 36767/16767 event protocol, applesauce-core EventFactory, nostr-tools NIP-19 decoding
**Confidence:** HIGH

## Summary

This phase delivers a `ThemePicker.svelte` modal that lets the site owner browse curated kind 36767 theme definitions, preview them live via the existing `applyTheme()` infrastructure, add custom themes via nevent paste, and publish the selected theme as kind 16767 to their NIP-65 write relays.

All required building blocks are already in the project: `theme.ts` has `applyTheme`/`clearTheme`, the `pool` prop (RelayPool) has `req()` for fetching kind 36767 events and `publish()` for emitting the kind 16767, `nostr-tools` provides `nip19.decode()` for nevent/naddr parsing, and `applesauce-core` has `EventFactory` for constructing events and `getOutboxes()` for reading NIP-65 write relays. The modal structure should mirror `LoginModal.svelte` exactly.

The key design tension is that `parseActiveProfileTheme` in `theme.ts` only handles kind 16767. Kind 36767 uses the same `c`/`f`/`bg` tag format, so a new `parseThemeDefinition(event)` function (accepting kind 36767 events) is needed in `theme.ts`, reusing the internal tag-parsing helpers. The planner should treat this utility addition as a prerequisite Wave 0 task.

**Primary recommendation:** Add `parseThemeDefinition()` to `theme.ts` for kind 36767 parsing, then build `ThemePicker.svelte` as a props-only modal following the LoginModal pattern, using `EventFactory` + `signer.signEvent` for publishing.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Theme Source & Fetching**
- Curated themes are a hardcoded list of nevent/naddr references shipped with the app
- Ship with 5-8 curated themes for reasonable variety
- Theme previews shown as color swatch strips (3 core colors: bg, text, primary as small circles/squares)
- Failed nevent fetch shows inline error under paste input: "Could not fetch theme event" with retry option

**Live Preview & Publishing**
- Live preview uses existing `applyTheme()` directly — instant, reversible via CSS custom properties
- On cancel/close: call `clearTheme()` then reapply the current active theme
- Publish kind 16767 to user's NIP-65 write relays (from kind 10002 events already in EventStore)
- Single "Apply Theme" button — no confirmation dialog (non-destructive, easily undone)
- Modal auto-closes on successful publish with brief success indicator

**Component Architecture**
- ThemePicker props: `signer`, `pool`, `pubkey`, `onclose` — minimal interface for extraction
- "Open theme picker" button lives in OwnerBadge component (auth-gated, owner-only)
- ThemePicker fetches kind 36767 events internally using the `pool` prop — self-contained
- Single file at `src/lib/components/ThemePicker.svelte` (extractable as-is)

### Claude's Discretion
- Internal layout of the theme picker modal (grid vs list for themes)
- Loading states while fetching curated themes from relays
- Exact styling of color swatches and theme cards
- How to handle the nevent paste input UX (input field + button vs paste-on-focus)
- Whether to show theme name/title alongside color swatches

### Deferred Ideas (OUT OF SCOPE)
- Custom theme creation from scratch with color pickers (v2)
- Publishing shareable kind 36767 themes (v2)
- Extracting ThemePicker as standalone npm package (v2)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| THEME-01 | Owner can open a theme picker modal dialog | OwnerBadge + showThemePicker state in +page.svelte; modal pattern from LoginModal.svelte |
| THEME-02 | Theme picker displays a list of curated kind 36767 themes | Hardcoded nevent list decoded via nip19.decode(); fetched with pool.req(); parsed with new parseThemeDefinition() |
| THEME-03 | Owner can paste nevent references to add custom themes to the picker list | nip19.decode() returns EventPointer with id + relays; pool.req() fetches event by id |
| THEME-04 | Owner can preview a theme before applying (live preview using applyTheme infrastructure) | applyTheme(parseThemeDefinition(event)) on theme card click; clearTheme() + reapply active on cancel |
| THEME-05 | Owner can publish selected theme as active profile theme (kind 16767) | EventFactory.build() constructs kind 16767; signer.signEvent(); pool.publish() to getOutboxes(kind10002) |
| THEME-06 | ThemePicker has no singleton imports — signer, relays, and pool received as props only | Props: signer, pool, pubkey, onclose; EventStore used only via getByFilters from eventStore prop or passed relays |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| applesauce-core | 5.1.0 | EventFactory for building kind 16767; EventStore for reading kind 10002 write relays | Already installed; provides signer-aware event construction |
| applesauce-relay | 5.1.0 | RelayPool.req() to fetch kind 36767 events; RelayPool.publish() to send kind 16767 | Already installed; pool singleton is passed as prop |
| nostr-tools | 2.23.3 | nip19.decode() for nevent/naddr paste decoding | Already installed; used in bootstrap.ts already |
| rxjs | 7.8.2 | Observable-based subscription to pool.req() responses | Already installed; used in loaders.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| applesauce-core/helpers/mailboxes | 5.1.0 | getOutboxes(kind10002Event) → string[] of write relay URLs | Needed to get publish targets for kind 16767 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| EventFactory.build() | Manual EventTemplate construction | EventFactory handles pubkey stamping and signer integration; manual construction is error-prone |
| pool.req() for curated themes | Pre-fetching at build time | Live fetch proves themes still exist; acceptable for 5-8 events |

**Installation:** No new packages needed. All dependencies are present.

---

## Architecture Patterns

### Recommended Project Structure
```
src/lib/
├── theme.ts                      # Add parseThemeDefinition() for kind 36767
├── components/
│   └── ThemePicker.svelte        # New: props-only modal
src/routes/
└── +page.svelte                  # Add showThemePicker state + ThemePicker render
```

Also touch `OwnerBadge.svelte` to add the "Theme" button trigger.

### Pattern 1: Kind 36767 Tag Format (Theme Definition)

**What:** A kind 36767 addressable event encodes a named theme using `c`, `f`, `bg`, `title`, `d`, and `alt` tags. Same tag structure as kind 16767 but includes a `d` tag identifier.

**When to use:** Fetching and parsing curated themes from relays. Also needed for reconstructing kind 16767 from a selected kind 36767 event.

```typescript
// Kind 36767 event structure (source: ditto/docs/THEME_SYSTEM.md + NIP.md)
// Tags:
// ["d", "ocean-night"]                        — identifier
// ["title", "Ocean Night"]                    — display name
// ["c", "#1a1a2e", "background"]              — bg hex
// ["c", "#e0e0e0", "text"]                    — text hex
// ["c", "#7c5cbf", "primary"]                 — primary hex
// ["f", "Comfortaa", "https://cdn..."]        — optional font
// ["bg", "url https://...", "mode cover"]     — optional bg image
// ["alt", "Custom theme: Ocean Night"]        — NIP-31 alt text
// ["t", "theme"]                              — topic

// Kind 16767 mirrors the same tags but omits "d" (only one per user)
// May add ["a", "<kind>:<pubkey>:<d>", "<relay>"] to reference source kind 36767
```

**Confidence:** HIGH (verified from ditto/docs/THEME_SYSTEM.md and NIP.md)

### Pattern 2: parseThemeDefinition() for kind 36767

**What:** A new exported function in `theme.ts` that parses kind 36767 events into `ActiveProfileTheme`. Reuses the same internal tag-parsing helpers already used by `parseActiveProfileTheme`.

**When to use:** When rendering color swatches in ThemePicker and when previewing a curated or custom theme.

```typescript
// Source: existing theme.ts internal helpers
/** Parse a kind 36767 shareable theme definition. Returns null if invalid. */
export function parseThemeDefinition(event: NostrEvent): ActiveProfileTheme | null {
    if (event.kind !== 36767) return null;
    const colors = parseColorTags(event.tags);
    if (!colors) return null;
    return {
        colors,
        font: parseFontTag(event.tags),
        background: parseBackgroundTag(event.tags),
    };
}
```

Note: `parseColorTags`, `parseFontTag`, `parseBackgroundTag` are already private helpers in `theme.ts` — they need to remain unexported per conventions; `parseThemeDefinition` calls them internally.

### Pattern 3: Building kind 16767 with EventFactory

**What:** Use `EventFactory.build()` to construct a kind 16767 EventTemplate from the selected theme's tags, then sign with the signer prop.

**When to use:** When the owner clicks "Apply Theme".

```typescript
// Source: applesauce-core/dist/event-factory/event-factory.d.ts
import { EventFactory } from 'applesauce-core/event-factory';

const factory = new EventFactory({ signer });
const template = await factory.build(
    {
        kind: 16767,
        content: '',
        tags: [
            ['c', selectedColors.background, 'background'],
            ['c', selectedColors.text, 'text'],
            ['c', selectedColors.primary, 'primary'],
            ['alt', 'Active profile theme'],
            // optional: ['a', `36767:${event.pubkey}:${dTag}`, '']
        ],
    }
);
const signed = await factory.sign(template);
await pool.publish(writeRelays, signed);
```

Note: Colors in kind 16767 tags must be **hex** (e.g., `#1a1a2e`), not the HSL strings stored in `ActiveProfileTheme`. The existing `theme.ts` converts hex → HSL during parsing. When building kind 16767, convert HSL back to hex OR store original hex alongside the parsed theme.

**Critical decision for planner:** The current `ActiveProfileTheme.colors` fields store HSL strings (after hex→HSL conversion in `parseColorTags`). Kind 16767 `c` tags require hex. The simplest approach is to store raw hex in a parallel `ThemeDefinition` interface or to extend the existing interface. Alternative: keep the original `NostrEvent` on the selected theme entry and copy tags directly when publishing.

**Recommended:** Keep original `NostrEvent` in the ThemePicker state. When publishing, copy the `c`, `f`, `bg`, `f` tags from the source event directly into the new kind 16767 event — no hex/HSL round-trip needed.

### Pattern 4: Reading NIP-65 Write Relays

**What:** `getOutboxes()` from `applesauce-core/helpers/mailboxes` reads a kind 10002 event and returns the write relay URLs.

**When to use:** Before publishing kind 16767 to know which relays to target.

```typescript
// Source: applesauce-core/dist/helpers/mailboxes.d.ts
import { getOutboxes } from 'applesauce-core/helpers/mailboxes';
import { eventStore } from '$lib/nostr/store'; // ONLY in +page.svelte; ThemePicker receives relays as prop

// In +page.svelte or as a prop passed to ThemePicker:
const kind10002Events = eventStore.getByFilters({ kinds: [10002], authors: [pubkey] });
const writeRelays = kind10002Events.length > 0
    ? getOutboxes(kind10002Events[0])
    : BOOTSTRAP_RELAYS; // fallback
```

**Prop design:** Since ThemePicker must not import `eventStore`, the write relays should be resolved in `+page.svelte` and passed as a `writeRelays: string[]` prop — OR ThemePicker resolves them by querying `pool` for kind 10002 internally using the `pubkey` prop.

**Recommended (aligned with locked decision "ThemePicker fetches internally using the pool prop"):** ThemePicker queries kind 10002 internally via `pool.req()` to get write relays. Alternatively, `+page.svelte` computes `writeRelays` reactively (it already subscribes to kind 10002) and passes it as a prop. Either is valid; passing as prop is simpler and avoids an internal subscription.

### Pattern 5: nevent/naddr Paste Decoding

**What:** Use `nip19.decode()` to decode a pasted nevent string, extract `EventPointer`, then fetch the event by ID from the provided relay hints (or fallback to BOOTSTRAP_RELAYS).

**When to use:** THEME-03 (custom theme paste input).

```typescript
// Source: nostr-tools/lib/types/nip19.d.ts
import { nip19 } from 'nostr-tools';

function decodeNeventInput(input: string): { id: string; relays: string[] } | null {
    try {
        const decoded = nip19.decode(input.trim());
        if (decoded.type === 'nevent') {
            return {
                id: decoded.data.id,
                relays: decoded.data.relays ?? [],
            };
        }
        if (decoded.type === 'note') {
            return { id: decoded.data, relays: [] };
        }
        // naddr would be kind 36767 addressable — also valid
        return null;
    } catch {
        return null; // invalid bech32
    }
}
```

Then fetch using `pool.req(relays.length > 0 ? relays : BOOTSTRAP_RELAYS, [{ ids: [id], kinds: [36767] }])`.

### Pattern 6: Modal Structure (follow LoginModal.svelte exactly)

```svelte
<!-- ThemePicker.svelte -->
<script lang="ts">
    import type { RelayPool } from 'applesauce-relay';
    import type { EventSigner } from 'applesauce-core/event-factory';

    let { signer, pool, pubkey, onclose }: {
        signer: EventSigner;
        pool: RelayPool;
        pubkey: string;
        onclose: () => void;
    } = $props();
    // ... $state, $derived, onMount
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<!-- Backdrop -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
     role="presentation" onclick={onclose}>
    <!-- Panel -->
    <div class="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl"
         role="dialog" aria-modal="true" aria-label="Theme Picker"
         tabindex="-1"
         onclick={(e) => e.stopPropagation()}
         onkeydown={(e) => e.key === 'Escape' && onclose()}>
        <!-- content -->
    </div>
</div>
```

### Anti-Patterns to Avoid

- **Importing eventStore or pool singletons in ThemePicker:** Violates THEME-06. Everything must come through props.
- **Using async onMount directly:** Per prior phase decision, use `.then()` inside synchronous `onMount` to avoid cleanup return type conflict.
- **Storing HSL strings in kind 16767 c tags:** Kind 16767 `c` tags require hex colors. Copy source event tags directly instead of round-tripping through HSL.
- **Using `export default` for ThemePicker:** Conventions require named exports; SvelteKit components are the exception but should still not be default-exported from barrel files.
- **Adding `<style>` blocks to ThemePicker:** Project convention is Tailwind utility classes only; no component-scoped style blocks.
- **CSS injection via font.family:** If a kind 36767 event has an `f` tag, the font family value flows into `applyTheme()` which writes it into a `<style>` element unescaped. Must validate font family names before calling `applyTheme` with user-supplied events (allow `[A-Za-z0-9 _-]` only; reject others with an inline warning).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Building kind 16767 event | Manual JSON construction | `EventFactory.build()` + `factory.sign()` | Handles pubkey stamping, created_at, and signer interface |
| Getting NIP-65 write relays | Manual tag parsing | `getOutboxes(kind10002Event)` from applesauce-core/helpers/mailboxes | Already handles write/read distinction and caching |
| Decoding nevent strings | Manual bech32 decode | `nip19.decode()` from nostr-tools | Handles all NIP-19 formats with typed return |
| Parsing theme tag format | Duplicate tag-parsing logic | `parseThemeDefinition()` (new function calling existing internal helpers in theme.ts) | Avoids duplicating parseColorTags, parseFontTag, parseBackgroundTag |
| CSS custom property injection | Inline style manipulation | `applyTheme()` from theme.ts | Already handles font-face, background-image, and all token derivation |

**Key insight:** The entire theme preview/apply stack already exists in `theme.ts`. ThemePicker only needs to select an event and call the existing functions.

---

## Common Pitfalls

### Pitfall 1: Hex vs HSL mismatch when publishing kind 16767
**What goes wrong:** `ActiveProfileTheme.colors` stores HSL strings (e.g., `"228 20% 10%"`). Kind 16767 `c` tags require hex (e.g., `"#1a1a2e"`). Writing HSL into the `c` tags produces an invalid event that other clients cannot parse.
**Why it happens:** `parseColorTags` converts hex → HSL during parsing, so by the time the data is in `ActiveProfileTheme` the original hex is gone.
**How to avoid:** Keep the original `NostrEvent` (kind 36767) in the selected theme state. Copy its `c`, `f`, `bg` tags directly into the new kind 16767 event. Do not rebuild from the parsed `ActiveProfileTheme`.
**Warning signs:** Published kind 16767 events that are ignored by other clients; color swatches appear correctly in picker (using HSL) but remote viewers see no theme.

### Pitfall 2: CSS injection via font.family from kind 36767 events
**What goes wrong:** `applyTheme()` writes `font-family: '${theme.font.family}'` directly into a `<style>` element. A malicious theme event could inject arbitrary CSS via the font family name.
**Why it happens:** The `applyTheme` function trusts the parsed font family string as safe CSS.
**How to avoid:** Before calling `applyTheme` with a user-fetched (non-curated) kind 36767 event, validate that `font.family` matches `/^[A-Za-z0-9 _-]+$/`. This was flagged in STATE.md blockers.
**Warning signs:** Font family names containing semicolons, braces, or slashes in fetched events.

### Pitfall 3: async onMount with cleanup return
**What goes wrong:** Writing `onMount(async () => { ... return cleanup; })` — the async function returns a Promise, not the cleanup function, so SvelteKit can't call cleanup on unmount.
**Why it happens:** async functions always return Promises.
**How to avoid:** Use synchronous `onMount(() => { fetch().then(...); return cleanup; })` or store subscriptions in state and unsubscribe in a separate `onDestroy`.
**Warning signs:** Memory leaks from relay subscriptions that don't clean up; existing `auth.svelte.ts` onMount in +page.svelte uses `.then()` pattern for this reason.

### Pitfall 4: Relaying to no relays on kind 16767 publish
**What goes wrong:** If the user has no kind 10002 event or `getOutboxes()` returns an empty array, `pool.publish([], event)` silently publishes to nothing.
**Why it happens:** Not all users have published a kind 10002 relay list.
**How to avoid:** Fall back to `BOOTSTRAP_RELAYS` if `writeRelays` is empty. Show the relay count in the success indicator ("Published to 3 relays") so the user can detect problems.
**Warning signs:** `pool.publish()` returns immediately with an empty results array.

### Pitfall 5: Curated theme fetch — wrong filter kind
**What goes wrong:** Fetching curated themes with `{ kinds: [16767] }` instead of `{ kinds: [36767] }`.
**Why it happens:** Confusion between the "active profile theme" (16767) and the "shareable theme definition" (36767). Both use identical tag structures.
**How to avoid:** Curated list fetches use `{ kinds: [36767] }`. Publishing the selection uses kind `16767`. The picker only reads 36767 from relays.
**Warning signs:** No theme results returned from relay queries; or events returned but `parseThemeDefinition()` returning null due to kind guard.

### Pitfall 6: nevent decoding — kind guard mismatch
**What goes wrong:** A pasted nevent might point to a non-theme event (e.g., a kind 1 note). Calling `parseThemeDefinition()` on it returns null without a user-visible explanation.
**Why it happens:** nevent references don't enforce a kind constraint at the encoding level; the `kind` field in `EventPointer` is optional.
**How to avoid:** After fetching, check `event.kind === 36767` and show inline error "This event is not a theme definition" if the kind doesn't match.

---

## Code Examples

### Verified: pool.req() subscription pattern (from loaders.ts)
```typescript
// Source: src/lib/nostr/loaders.ts (established project pattern)
import { filter } from 'rxjs';

const sub = pool
    .req(relays, [{ kinds: [36767], ids: [eventId] }])
    .subscribe((msg) => {
        if (msg !== 'EOSE') {
            // msg is a NostrEvent
            handleEvent(msg);
        }
    });
// cleanup:
sub.unsubscribe();
```

### Verified: pool.publish() call signature
```typescript
// Source: applesauce-relay/dist/pool.d.ts
// publish(relays, event, opts?) returns Promise<PublishResponse[]>
const results = await pool.publish(writeRelays, signedEvent);
```

### Verified: getOutboxes() usage
```typescript
// Source: applesauce-core/dist/helpers/mailboxes.d.ts
import { getOutboxes } from 'applesauce-core/helpers/mailboxes';
// Takes a kind 10002 NostrEvent, returns string[] of outbox (write) relay URLs
const writeRelays = getOutboxes(kind10002Event);
```

### Verified: nip19.decode() for nevent
```typescript
// Source: nostr-tools/lib/types/nip19.d.ts
import { nip19 } from 'nostr-tools';
const decoded = nip19.decode(input); // throws on invalid bech32
// decoded.type === 'nevent' → decoded.data: { id, relays?, author?, kind? }
// decoded.type === 'naddr'  → decoded.data: { identifier, pubkey, kind, relays? }
// decoded.type === 'note'   → decoded.data: eventId string
```

### Verified: EventFactory build + sign
```typescript
// Source: applesauce-core/dist/event-factory/event-factory.d.ts
import { EventFactory } from 'applesauce-core/event-factory';

const factory = new EventFactory({ signer });
const template = await factory.build({
    kind: 16767,
    content: '',
    tags: [/* copied from source kind 36767 event, minus 'd' tag */],
});
const signed = await factory.sign(template); // returns NostrEvent
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Colors as JSON in kind 16767 `content` | Colors as `c` tags on the event | Ditto theme v2 spec | `parseActiveProfileTheme` handles both (legacy JSON fallback exists in theme.ts) |
| Hex colors in internal structures | Hex in event tags, HSL internally for CSS | Current spec | Must not round-trip through HSL when re-publishing |

**Deprecated/outdated:**
- Legacy kind 16767 with JSON `content`: Still parsed as fallback in `parseActiveProfileTheme` but never published by new code. New kind 16767 events use `c` tags only.

---

## Open Questions

1. **Curated theme nevent/naddr references**
   - What we know: Must ship 5-8 curated references as a hardcoded list in the component
   - What's unclear: The specific event IDs/addresses of production kind 36767 themes on public relays have not yet been surveyed. STATE.md flags this as a known gap.
   - Recommendation: During Wave 0 / planner's first task, query BOOTSTRAP_RELAYS for `{ kinds: [36767], limit: 20 }` to discover real theme events and hardcode their naddr references. Alternatively, use events authored by the Ditto/Soapbox team pubkey. The planner should include a "survey and hardcode" step as a prerequisite.

2. **writeRelays prop vs internal resolution**
   - What we know: Locked decisions say ThemePicker fetches internally using pool prop. Kind 10002 is already in EventStore via +page.svelte subscriptions.
   - What's unclear: Whether to pass `writeRelays` as a 5th prop (simpler) or have ThemePicker query pool for kind 10002 itself (more self-contained).
   - Recommendation: Add `writeRelays: string[]` as a 5th prop. +page.svelte already has the kind 10002 subscription; computing write relays there and passing them down is simpler and avoids an extra pool.req() inside ThemePicker. This aligns with "minimal interface" intent while keeping ThemePicker self-contained relative to the eventStore singleton.

3. **`a` tag reference in kind 16767 (linking back to source kind 36767)**
   - What we know: Kind 16767 spec supports an optional `a` tag referencing the source kind 36767 addressable event.
   - What's unclear: Whether clients use this for display purposes and whether omitting it causes issues.
   - Recommendation: Include the `a` tag when publishing from a known kind 36767 event (curated or pasted). Omit when source is unknown. Low risk either way.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies beyond the project's own code — all required packages already installed, no new CLI tools, databases, or services required).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 + @testing-library/svelte 5.3.1 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run src/lib/__tests__/theme.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| THEME-01 | "Theme" button visible in OwnerBadge when owner | unit (component) | `npx vitest run src/lib/__tests__/OwnerBadge.test.ts` | ❌ Wave 0 |
| THEME-02 | parseThemeDefinition() returns ActiveProfileTheme from kind 36767 event | unit | `npx vitest run src/lib/__tests__/theme.test.ts` | ❌ Wave 0 |
| THEME-03 | decodeNeventInput() extracts id + relays from nevent string | unit | `npx vitest run src/lib/__tests__/theme.test.ts` | ❌ Wave 0 |
| THEME-04 | applyTheme called on selection; clearTheme + reapply on cancel | unit (component) | `npx vitest run src/lib/__tests__/ThemePicker.test.ts` | ❌ Wave 0 |
| THEME-05 | EventFactory.build() + sign + pool.publish called on Apply | unit (component) | `npx vitest run src/lib/__tests__/ThemePicker.test.ts` | ❌ Wave 0 |
| THEME-06 | ThemePicker.svelte has no singleton imports | static (grep) | `grep -n "from.*store\|from.*auth" src/lib/components/ThemePicker.svelte` | N/A — manual |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/__tests__/theme.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/theme.test.ts` — covers THEME-02 (parseThemeDefinition) and THEME-03 (nevent decode helper)
- [ ] `src/lib/__tests__/ThemePicker.test.ts` — covers THEME-04 and THEME-05 using mocked pool/signer/applyTheme
- [ ] `src/lib/__tests__/OwnerBadge.test.ts` — covers THEME-01 (Theme button visibility)

---

## Project Constraints (from CLAUDE.md)

- **Branching**: Each feature on a separate branch, published as a PR
- **Component isolation**: ThemePicker must be architecturally separable — props-only design, no singleton imports
- **Signing**: All write operations use the logged-in signer (NIP-07 or NIP-46)
- **No backend**: All data flows through Nostr relays
- **Svelte 5 runes only**: `$props()`, `$state()`, `$derived()` — no legacy `$:` reactivity
- **Tailwind utility classes only**: No `<style>` blocks in any `.svelte` file
- **Named exports only**: No default exports (except SvelteKit config files)
- **No `async onMount`**: Use `.then()` inside synchronous `onMount` (cleanup return incompatibility)
- **Tabs for indentation**, single quotes, trailing commas, semicolons used consistently
- **No `--break-system-packages`**: Use environments for any tooling installs
- **Naming**: PascalCase components, camelCase functions/variables, UPPER_SNAKE_CASE module constants
- **TypeScript strict mode**: No implicit any; use `as any` with inline comment only when necessary

---

## Sources

### Primary (HIGH confidence)
- `src/lib/theme.ts` — complete tag-parsing logic for kind 16767; internal helpers reusable for kind 36767
- `applesauce-core/dist/event-factory/event-factory.d.ts` — EventFactory API (build, sign, setSigner)
- `applesauce-core/dist/helpers/mailboxes.d.ts` — getOutboxes() for NIP-65 write relay extraction
- `applesauce-relay/dist/pool.d.ts` — RelayPool.req() and RelayPool.publish() signatures
- `nostr-tools/lib/types/nip19.d.ts` — nip19.decode() typed return for nevent, naddr, note
- `src/lib/components/LoginModal.svelte` — established modal pattern for ThemePicker to follow
- `src/lib/nostr/loaders.ts` — established pool.req() subscription pattern with EOSE handling

### Secondary (MEDIUM confidence)
- `https://raw.githubusercontent.com/soapbox-pub/ditto/main/docs/THEME_SYSTEM.md` — kind 36767 tag spec (title, d, c×3, f, bg, alt tags) and kind 16767 structure
- `https://raw.githubusercontent.com/soapbox-pub/ditto/main/NIP.md` — confirms kind 36767 is addressable; kind 16767 is replaceable (one per user); content must be empty string

### Tertiary (LOW confidence)
- STATE.md blocker note: "Kind 36767 curated theme sources (relay endpoints / event IDs) not yet identified — survey bootstrap relays during Phase 2 planning" — confirms the curated theme survey is an open action item

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages installed and type-checked locally
- Architecture patterns: HIGH — based on reading actual source files, type definitions, and verified ditto theme spec
- Pitfalls: HIGH — derived from code inspection (hex/HSL mismatch is an objective code fact; CSS injection is documented in STATE.md)
- Curated theme event IDs: LOW — not yet surveyed; Wave 0 task required

**Research date:** 2026-04-09
**Valid until:** 2026-07-09 (stable libraries; Ditto theme spec unlikely to change for kind 36767/16767)
