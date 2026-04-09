# Phase 2: Theme Picker - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers a theme picker modal that lets the site owner browse curated kind 36767 themes, preview them live on the page, add custom themes via nevent paste, and publish a selected theme as their active kind 16767 profile theme. The component must be architecturally self-contained (props only, no app singleton imports) for future extraction as a standalone package.

</domain>

<decisions>
## Implementation Decisions

### Theme Source & Fetching
- Curated themes are a hardcoded list of nevent/naddr references shipped with the app
- Ship with 5-8 curated themes for reasonable variety
- Theme previews shown as color swatch strips (3 core colors: bg, text, primary as small circles/squares)
- Failed nevent fetch shows inline error under paste input: "Could not fetch theme event" with retry option

### Live Preview & Publishing
- Live preview uses existing `applyTheme()` directly — instant, reversible via CSS custom properties
- On cancel/close: call `clearTheme()` then reapply the current active theme
- Publish kind 16767 to user's NIP-65 write relays (from kind 10002 events already in EventStore)
- Single "Apply Theme" button — no confirmation dialog (non-destructive, easily undone)
- Modal auto-closes on successful publish with brief success indicator

### Component Architecture
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/theme.ts` — `parseActiveProfileTheme()`, `applyTheme()`, `clearTheme()`, `deriveTokens()` — all directly reusable for preview
- `src/lib/auth.svelte.ts` — `signer` (reactive $state), `isOwner()` getter — provides signer for publishing
- `src/lib/nostr/store.ts` — `pool` singleton (RelayPool), `eventStore` singleton
- `src/lib/components/OwnerBadge.svelte` — where the "Theme" button will be added
- `src/lib/components/LoginModal.svelte` — modal pattern to follow (backdrop, Escape close, focus trap)

### Established Patterns
- Modal: role="dialog", backdrop click close, Escape key close, tabindex="-1", onkeydown handler
- Tailwind utility classes only, no <style> blocks
- Svelte 5 runes: $props(), $state(), $derived()
- Named exports only, camelCase functions, PascalCase components
- RxJS observables from EventStore bridged to $state in onMount

### Integration Points
- `OwnerBadge.svelte` — add "Theme" button that opens ThemePicker
- `+page.svelte` — conditionally render ThemePicker modal, pass signer/pool/pubkey props
- `src/lib/nostr/store.ts` — pool.req() for fetching kind 36767 events from relays
- `src/lib/theme.ts` — applyTheme() for live preview, clearTheme() for reset

</code_context>

<specifics>
## Specific Ideas

- Ditto theme spec: kind 36767 = shareable theme definition (d-tag, 3x c tags, optional f/bg tags), kind 16767 = active profile theme (replaceable, one per user)
- ThemePicker must build kind 16767 events using EventFactory from applesauce-core and sign with the signer prop
- For nevent paste: decode nevent using nostr-tools nip19.decode(), extract event ID and optional relay hints, fetch from relays
- Default NIP-46 relay (from Phase 1): wss://bucket.coracle.social
- Font sanitization: if kind 36767 themes include font tags, validate font family names before applying (prevent CSS injection)

</specifics>

<deferred>
## Deferred Ideas

- Custom theme creation from scratch with color pickers (v2)
- Publishing shareable kind 36767 themes (v2)
- Extracting ThemePicker as standalone npm package (v2)

</deferred>
