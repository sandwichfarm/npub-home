<!-- GSD:project-start source:PROJECT.md -->
## Project

**npub-home**

npub-home is a client-side SPA that serves as a landing page for a Nostr user's nsites (static websites discovered over Nostr via NIP-5A and hosted by Blossom). The user's identity is derived from the hostname — no login required for visitors. It fetches profile metadata, nsite entries, and theme data from Nostr relays and renders a themed profile page with links to the user's nsites.

**Core Value:** Show a Nostr user's nsites in one place, styled with their profile theme, with zero configuration for visitors.

### Constraints

- **Branching**: Each feature must be developed on a separate branch and published as a PR
- **Component isolation**: Theme picker must be architecturally separable for future extraction as a standalone package
- **Signing**: All write operations (theme publishing, nsite editing/deletion) use the logged-in signer (NIP-07 or NIP-46)
- **No backend**: All data flows through Nostr relays; no server-side logic
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.9.3 - All application logic (`src/lib/**/*.ts`, `src/routes/**/*.svelte`)
- Svelte 5.51.0 - Component templates using Svelte 5 runes syntax (`$props()`, `$state()`, `$derived()`)
- CSS - Tailwind CSS v4 with custom theme tokens (`src/app.css`)
- HTML - SvelteKit app shell (`src/app.html`)
## Runtime
- Node.js 22.22.1 (system)
- Browser-only SPA at runtime (SSR disabled in `src/routes/+layout.ts`: `export const ssr = false`)
- pnpm (lockfile version 9.0)
- Lockfile: `pnpm-lock.yaml` present
- Note: `package-lock.json` also exists (legacy/unused)
## Frameworks
- SvelteKit 2.50.2 - Application framework (`svelte.config.js`, `vite.config.ts`)
- Svelte 5.51.0 - Component framework using runes mode (NOT legacy `$:` reactivity)
- Tailwind CSS 4.2.1 - Utility-first CSS via Vite plugin (`@tailwindcss/vite`)
- Vite 7.3.1 - Build tool and dev server (`vite.config.ts`)
- `@sveltejs/adapter-static` 3.0.10 - Static SPA output to `dist/` with `index.html` fallback (`svelte.config.js`)
- `@sveltejs/vite-plugin-svelte` 6.2.4 - Svelte compilation for Vite
- `svelte-check` 4.4.2 - Type checking
- Not configured. No test framework, no test files.
## Key Dependencies
- `applesauce-core` 5.1.0 - Nostr EventStore for reactive event management. Provides `EventStore` class and profile helpers. Used in `src/lib/nostr/store.ts` and `src/routes/+page.svelte`.
- `applesauce-relay` 5.1.0 - Nostr relay connection pool built on RxJS. Provides `RelayPool` class. Used in `src/lib/nostr/store.ts`.
- `nostr-tools` 2.23.3 - Nostr protocol utilities (NIP-19 npub encoding/decoding). Used in `src/lib/nostr/bootstrap.ts` and type definitions throughout.
- `rxjs` 7.8.2 - Reactive streams for relay subscriptions. Used in `src/lib/nostr/loaders.ts` (pipe/filter operators).
- `@nsite/stealthis` 0.2.0 - Web component for "steal this nsite" button. Dynamically imported in `src/routes/+page.svelte` via `import('@nsite/stealthis')`. Renders `<nsite-deploy>` custom element.
- `@tailwindcss/vite` 4.2.1 - Tailwind CSS Vite plugin (replaces PostCSS-based approach from v3)
## Configuration
- `.env` file present (contains `VITE_DEV_NPUB` for local development)
- Only one env var used: `VITE_DEV_NPUB` - accessed via `import.meta.env.VITE_DEV_NPUB` in `src/lib/nostr/bootstrap.ts`
- In production, the npub is parsed from the hostname (no env vars needed)
- `tsconfig.json` - Extends SvelteKit generated config
- Strict mode enabled
- Module resolution: `bundler`
- Path alias: `$lib` maps to `src/lib/` (SvelteKit default)
- `svelte.config.js` - Static adapter outputting to `dist/` directory
- `vite.config.ts` - Tailwind CSS plugin + SvelteKit plugin
- Output: Static SPA with `index.html` fallback (SPA routing)
- No SSR, no prerendering (`src/routes/+layout.ts`)
- `.nsite/` directory contains nsite deployment config
- `.nsite/named.json` - Named site configuration (bunker pubkey, relays, blossom servers)
- Deployed via nsite protocol to Nostr relay infrastructure
## Platform Requirements
- Node.js 22+ (ES modules, modern APIs)
- pnpm package manager
- `.env` file with `VITE_DEV_NPUB=npub1...` for localhost testing
- Static file hosting (outputs to `dist/`)
- Deployed as an nsite (Nostr-based website hosting)
- Requires hostname in format `npub1xxx.nsite-host.com` or `<base36pubkey><dtag>.nsite-host.com`
## Scripts
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Svelte components: PascalCase (`ProfileCard.svelte`, `NsiteList.svelte`, `ErrorMessage.svelte`, `LoadingSpinner.svelte`)
- TypeScript modules: camelCase (`avatarShape.ts`, `bootstrap.ts`, `cache.ts`, `loaders.ts`, `store.ts`, `theme.ts`)
- SvelteKit routes: SvelteKit convention with `+` prefix (`+page.svelte`, `+layout.svelte`, `+layout.ts`)
- camelCase for all functions: `parseNpubFromHostname`, `buildSiteUrl`, `getAvatarShape`, `getNsitesFromStore`
- Prefix getters with `get`: `getAvatarShape()`, `getEmojiMaskUrl()`, `getNsitesFromStore()`
- Prefix parsers with `parse`: `parseNpubFromHostname()`, `parseActiveProfileTheme()`, `parseColorTags()`
- Prefix boolean checkers with `is`: `isEmoji()`, `isDarkTheme()`, `isReplaceable()`
- camelCase for all variables: `activePubkey`, `bootstrapSub`, `displayName`
- Constants: UPPER_SNAKE_CASE for module-level constants: `BOOTSTRAP_RELAYS`, `CACHE_KEY_PREFIX`, `PUBKEY_B36_LEN`, `ALPHA_THRESHOLD`
- PascalCase for interfaces and types: `ParsedHost`, `NsiteEntry`, `CoreThemeColors`, `ThemeTokens`, `ActiveProfileTheme`
- Prefix with domain context, not `I`: `ThemeFont` not `IThemeFont`
- Export interfaces that are used across module boundaries
## Code Style
- Tabs for indentation (default SvelteKit/Prettier)
- Single quotes for strings
- Trailing commas in multiline constructs
- No semicolons omitted -- semicolons used consistently
- No explicit Prettier config file present; relies on SvelteKit defaults
- No ESLint or Biome config present
- One legacy `// eslint-disable-next-line no-control-regex` comment in `src/lib/avatarShape.ts` suggests ESLint was used at some point but config has been removed
- Type checking via `svelte-check`: run with `npm run check` or `npm run check:watch`
- `strict: true` in `tsconfig.json`
- `checkJs: true` and `allowJs: true` enabled
- `moduleResolution: "bundler"`
## Import Organization
- `$lib` maps to `src/lib/` (SvelteKit default)
- No custom path aliases configured
## Svelte Component Patterns
## Error Handling
- Empty `catch {}` blocks for non-critical failures (localStorage, JSON parsing, base36 conversion)
- Guard-clause returns: functions return `null`, `undefined`, `''`, or `[]` on invalid input rather than throwing
- No custom error classes or centralized error handling
- User-facing errors rendered via `ErrorMessage` component with a string message
## Styling Approach
- `src/app.css` imports Tailwind and defines a custom `@theme` block with CSS custom property mappings
- Design tokens defined as HSL values in CSS custom properties on `:root` (e.g., `--background: 228 20% 10%`)
- Tailwind theme extended to consume these tokens: `--color-background: hsl(var(--background))`
- Theme is dark by default (dark HSL values in `:root`)
- `src/lib/theme.ts` can override CSS custom properties at runtime by injecting `<style>` elements
- Profile theme events (kind 16767) drive dynamic color, font, and background changes
- `applyTheme()` and `clearTheme()` manage runtime theme injection/removal
- All styling done via Tailwind utility classes in templates
- No component-scoped `<style>` blocks in any `.svelte` file
- Use semantic color names from theme tokens: `text-foreground`, `bg-background`, `text-muted-foreground`, `border-border`, `bg-card`, `text-primary`
## Reactive Data / State Management
## Comments
- JSDoc-style block comments on exported functions and significant utilities
- Section dividers using `// --- Section Name ---` pattern (see `src/lib/theme.ts`)
- Inline comments for non-obvious logic (e.g., canvas pixel manipulation steps)
- Empty catch blocks get a brief comment explaining why silent failure is acceptable
## Module Design
- Named exports only (no default exports except SvelteKit config files)
- Export functions and types/interfaces that are used across modules
- Keep module-private helpers unexported (e.g., `parseColorTags`, `parseFontTag` in `theme.ts`)
- `src/lib/index.ts` exists but is empty (placeholder comment only)
- Components imported directly by path, not via barrel
- `src/lib/nostr/` groups all Nostr protocol logic (relay connections, event store, caching, data loading)
- `src/lib/components/` groups all UI components
- `src/lib/theme.ts` and `src/lib/avatarShape.ts` are standalone domain utilities at `$lib` root
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Fully client-side rendered SPA (SSR disabled, static adapter outputs to `dist/`)
- Reactive streaming architecture: Nostr events flow from relays into a centralized EventStore, UI reacts to store changes via RxJS subscriptions
- Single-page app with one route (`+page.svelte`) that acts as the orchestrator
- Domain-driven identity: the user's public key is parsed from the hostname, not from login or URL params
- No backend or API server; all data comes from Nostr relays over WebSockets
## Layers
- Purpose: Render UI based on reactive state derived from the EventStore
- Location: `src/lib/components/` and `src/routes/+page.svelte`
- Contains: Svelte 5 components using `$props()`, `$state()`, and `$derived()` runes
- Depends on: Nostr layer (loaders, store, bootstrap), Theme layer
- Used by: SvelteKit routing
- Purpose: Manage relay connections, event subscriptions, caching, and event storage
- Location: `src/lib/nostr/`
- Contains: EventStore + RelayPool singletons (`store.ts`), relay subscription logic (`loaders.ts`), hostname parsing and URL building (`bootstrap.ts`), localStorage caching (`cache.ts`)
- Depends on: `applesauce-core`, `applesauce-relay`, `nostr-tools`, `rxjs`
- Used by: Presentation layer (`+page.svelte`)
- Purpose: Parse kind 16767 Nostr events into theme tokens and apply them as CSS custom properties
- Location: `src/lib/theme.ts`
- Contains: HSL/RGB color utilities, theme token derivation, DOM style injection
- Depends on: `nostr-tools` (type only)
- Used by: `+page.svelte` (reactive theme subscription)
- Purpose: Provide shared helper functions
- Location: `src/lib/avatarShape.ts`
- Contains: Emoji detection, canvas-based alpha mask generation for avatar shapes
- Depends on: Browser Canvas API
- Used by: `ProfileCard.svelte`
## Data Flow
- Global state: `eventStore` (applesauce-core `EventStore` singleton) and `pool` (applesauce-relay `RelayPool` singleton) in `src/lib/nostr/store.ts`
- Component state: Svelte 5 runes (`$state`, `$derived`, `$props`) for local reactive state
- Persistence: localStorage cache per pubkey, keyed as `nostr-events:{pubkey}`
- No Svelte stores (`writable`/`readable`); all reactivity flows through RxJS observables from the EventStore, bridged to Svelte state in `onMount`
## Key Abstractions
- Purpose: Central in-memory store for all Nostr events, queryable by filters
- Examples: `src/lib/nostr/store.ts`
- Pattern: Singleton export, queried via `.profile(pubkey)`, `.filters({...})`, `.getByFilters({...})`
- Purpose: Manages WebSocket connections to multiple Nostr relays, provides `.req()` for subscriptions
- Examples: `src/lib/nostr/store.ts`
- Pattern: Singleton export, `.req(relays, filters)` returns an RxJS Observable of events
- Purpose: Normalized representation of an nsite (named subsite) for display
- Examples: `src/lib/nostr/loaders.ts`
- Pattern: Interface with `slug`, `createdAt`, `title`, `description` fields, extracted from kind 35128/15128 events
- Purpose: Result of parsing the hostname to extract npub, pubkey, and optional named site identifier
- Examples: `src/lib/nostr/bootstrap.ts`
- Pattern: Interface returned by `parseNpubFromHostname()`
- Purpose: Parsed theme data from a kind 16767 event, ready for DOM application
- Examples: `src/lib/theme.ts`
- Pattern: Interface with `colors`, optional `font`, optional `background`
## Entry Points
- Location: `src/app.html`
- Triggers: Initial page load
- Responsibilities: HTML boilerplate, SvelteKit head/body placeholder injection
- Location: `src/routes/+layout.svelte` and `src/routes/+layout.ts`
- Triggers: Every route load
- Responsibilities: Disables SSR (`ssr = false`, `prerender = false`), imports `app.css`, sets favicon
- Location: `src/routes/+page.svelte`
- Triggers: App load (single route SPA)
- Responsibilities: Parses hostname, initializes Nostr subscriptions, wires reactive state to components, manages cleanup on unmount
## Error Handling
- Hostname parsing failure shows an `ErrorMessage` component with guidance to deploy to an nsite domain
- localStorage operations wrapped in try/catch with silent fallback (cache unavailable does not break the app)
- Invalid npub/base36 decoding caught silently, returns `null`
- Missing profile data handled with fallback display (first letter avatar, truncated npub as name)
- No global error boundary; errors are handled locally at each point of failure
## Cross-Cutting Concerns
## Nostr Event Kinds Used
| Kind | Purpose | Type |
|------|---------|------|
| 0 | User profile metadata | Replaceable |
| 10002 | Relay list (NIP-65) | Replaceable |
| 15128 | Root nsite event | Replaceable |
| 35128 | Named nsite events | Parameterized replaceable |
| 16767 | Active profile theme | Ephemeral replaceable |
## Third-Party Web Component
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
