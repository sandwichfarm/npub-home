# Coding Conventions

**Analysis Date:** 2026-04-09

## Naming Patterns

**Files:**
- Svelte components: PascalCase (`ProfileCard.svelte`, `NsiteList.svelte`, `ErrorMessage.svelte`, `LoadingSpinner.svelte`)
- TypeScript modules: camelCase (`avatarShape.ts`, `bootstrap.ts`, `cache.ts`, `loaders.ts`, `store.ts`, `theme.ts`)
- SvelteKit routes: SvelteKit convention with `+` prefix (`+page.svelte`, `+layout.svelte`, `+layout.ts`)

**Functions:**
- camelCase for all functions: `parseNpubFromHostname`, `buildSiteUrl`, `getAvatarShape`, `getNsitesFromStore`
- Prefix getters with `get`: `getAvatarShape()`, `getEmojiMaskUrl()`, `getNsitesFromStore()`
- Prefix parsers with `parse`: `parseNpubFromHostname()`, `parseActiveProfileTheme()`, `parseColorTags()`
- Prefix boolean checkers with `is`: `isEmoji()`, `isDarkTheme()`, `isReplaceable()`

**Variables:**
- camelCase for all variables: `activePubkey`, `bootstrapSub`, `displayName`
- Constants: UPPER_SNAKE_CASE for module-level constants: `BOOTSTRAP_RELAYS`, `CACHE_KEY_PREFIX`, `PUBKEY_B36_LEN`, `ALPHA_THRESHOLD`

**Types/Interfaces:**
- PascalCase for interfaces and types: `ParsedHost`, `NsiteEntry`, `CoreThemeColors`, `ThemeTokens`, `ActiveProfileTheme`
- Prefix with domain context, not `I`: `ThemeFont` not `IThemeFont`
- Export interfaces that are used across module boundaries

## Code Style

**Formatting:**
- Tabs for indentation (default SvelteKit/Prettier)
- Single quotes for strings
- Trailing commas in multiline constructs
- No semicolons omitted -- semicolons used consistently
- No explicit Prettier config file present; relies on SvelteKit defaults

**Linting:**
- No ESLint or Biome config present
- One legacy `// eslint-disable-next-line no-control-regex` comment in `src/lib/avatarShape.ts` suggests ESLint was used at some point but config has been removed
- Type checking via `svelte-check`: run with `npm run check` or `npm run check:watch`

**TypeScript Strictness:**
- `strict: true` in `tsconfig.json`
- `checkJs: true` and `allowJs: true` enabled
- `moduleResolution: "bundler"`

## Import Organization

**Order:**
1. Framework/library imports (`svelte`, `rxjs`, `nostr-tools`)
2. Internal `$lib/` imports (using SvelteKit `$lib` alias)
3. Type-only imports use `import type { ... }` syntax

**Path Aliases:**
- `$lib` maps to `src/lib/` (SvelteKit default)
- No custom path aliases configured

**Examples from `src/routes/+page.svelte`:**
```typescript
import { onMount } from 'svelte';
import { parseNpubFromHostname } from '$lib/nostr/bootstrap';
import { subscribe, hydrateFromCache, getNsitesFromStore, type NsiteEntry } from '$lib/nostr/loaders';
import { eventStore } from '$lib/nostr/store';
import { parseActiveProfileTheme, applyTheme, clearTheme } from '$lib/theme';
import type { ProfileContent } from 'applesauce-core/helpers/profile';
import ProfileCard from '$lib/components/ProfileCard.svelte';
```

**Pattern:** Type-only imports use the `type` keyword either as `import type { X }` or inline `import { type X, Y }`.

## Svelte Component Patterns

**Svelte Version:** 5 (uses runes API)

**Props:** Use `$props()` rune with inline type annotation:
```typescript
let {
    profile,
    npub
}: {
    profile: ProfileContent | undefined;
    npub: string;
} = $props();
```

**Derived State:** Use `$derived()` rune:
```typescript
const displayName = $derived(
    profile?.display_name || profile?.name || npub.slice(0, 12) + '...'
);
```

**Reactive State:** Use `$state()` rune:
```typescript
let error = $state<string | null>(null);
let profile = $state<ProfileContent | undefined>(undefined);
```

**Lifecycle:** Use `onMount()` with cleanup function returned:
```typescript
onMount(() => {
    // setup...
    return () => {
        // cleanup subscriptions
    };
});
```

**Component Structure:**
1. `<script lang="ts">` block with imports, props, derived values, and logic
2. Template markup (no `<script>` at bottom)
3. No `<style>` blocks -- all styling via Tailwind utility classes

**Layout Pattern:** `+layout.svelte` uses `$props()` for children and `{@render children()}`:
```svelte
let { children } = $props();
{@render children()}
```

**SvelteKit SSR:** Disabled. `+layout.ts` exports `ssr = false` and `prerender = false`. This is a client-side-only SPA.

## Error Handling

**Patterns:**
- Empty `catch {}` blocks for non-critical failures (localStorage, JSON parsing, base36 conversion)
- Guard-clause returns: functions return `null`, `undefined`, `''`, or `[]` on invalid input rather than throwing
- No custom error classes or centralized error handling
- User-facing errors rendered via `ErrorMessage` component with a string message

**Examples:**
```typescript
// Silent catch for non-critical operations (cache.ts)
try {
    localStorage.setItem(cacheKey(pubkey), JSON.stringify(existing));
} catch {
    // localStorage full or unavailable -- silently ignore
}

// Guard clause with early return (bootstrap.ts)
if (!parsed) {
    error = 'No npub found in hostname. Deploy this site to an nsite domain.';
    return;
}
```

## Styling Approach

**Framework:** Tailwind CSS v4 via `@tailwindcss/vite` plugin

**CSS Architecture:**
- `src/app.css` imports Tailwind and defines a custom `@theme` block with CSS custom property mappings
- Design tokens defined as HSL values in CSS custom properties on `:root` (e.g., `--background: 228 20% 10%`)
- Tailwind theme extended to consume these tokens: `--color-background: hsl(var(--background))`
- Theme is dark by default (dark HSL values in `:root`)

**Dynamic Theming:**
- `src/lib/theme.ts` can override CSS custom properties at runtime by injecting `<style>` elements
- Profile theme events (kind 16767) drive dynamic color, font, and background changes
- `applyTheme()` and `clearTheme()` manage runtime theme injection/removal

**Utility-Only Approach:**
- All styling done via Tailwind utility classes in templates
- No component-scoped `<style>` blocks in any `.svelte` file
- Use semantic color names from theme tokens: `text-foreground`, `bg-background`, `text-muted-foreground`, `border-border`, `bg-card`, `text-primary`

**Common Tailwind Patterns:**
```svelte
<!-- Layout centering -->
<div class="mx-auto max-w-2xl py-8">

<!-- Card styling -->
<div class="overflow-hidden rounded-xl border border-border bg-background">

<!-- Interactive element -->
<a class="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition hover:border-primary/50 hover:bg-secondary">

<!-- Conditional classes with ternary -->
<div class="... {profile?.banner ? '-mt-12' : 'pt-8'}">
```

## Reactive Data / State Management

**Pattern:** RxJS Observables + Svelte runes

**Data Flow:**
1. `applesauce-relay` `RelayPool` sends Nostr subscription requests
2. Events stream into `applesauce-core` `EventStore` singleton (`src/lib/nostr/store.ts`)
3. `EventStore` observables (`.profile()`, `.filters()`) subscribed in `onMount`
4. RxJS subscriptions update Svelte `$state()` variables
5. Svelte reactivity renders updates

**Subscription Cleanup:** All RxJS subscriptions unsubscribed in the cleanup function returned from `onMount`.

## Comments

**When to Comment:**
- JSDoc-style block comments on exported functions and significant utilities
- Section dividers using `// --- Section Name ---` pattern (see `src/lib/theme.ts`)
- Inline comments for non-obvious logic (e.g., canvas pixel manipulation steps)
- Empty catch blocks get a brief comment explaining why silent failure is acceptable

**JSDoc Usage:**
```typescript
/** Check if a string is likely an emoji (short, non-ASCII). */
function isEmoji(value: string): boolean {

/**
 * Render an emoji onto a canvas and produce a PNG data-URL alpha mask
 * for use as a CSS `mask-image`.
 *
 * 1. Draw emoji at 512px on oversized scratch canvas
 * 2. Find tight bounding box of non-transparent pixels
 * ...
 */
export function getEmojiMaskUrl(emoji: string): string {
```

## Module Design

**Exports:**
- Named exports only (no default exports except SvelteKit config files)
- Export functions and types/interfaces that are used across modules
- Keep module-private helpers unexported (e.g., `parseColorTags`, `parseFontTag` in `theme.ts`)

**Barrel Files:**
- `src/lib/index.ts` exists but is empty (placeholder comment only)
- Components imported directly by path, not via barrel

**Module Cohesion:**
- `src/lib/nostr/` groups all Nostr protocol logic (relay connections, event store, caching, data loading)
- `src/lib/components/` groups all UI components
- `src/lib/theme.ts` and `src/lib/avatarShape.ts` are standalone domain utilities at `$lib` root

---

*Convention analysis: 2026-04-09*
