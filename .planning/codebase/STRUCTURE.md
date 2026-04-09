# Codebase Structure

**Analysis Date:** 2026-04-09

## Directory Layout

```
npub-home/
├── src/                        # Application source code
│   ├── app.css                 # Global styles, Tailwind import, CSS custom property defaults
│   ├── app.d.ts                # SvelteKit type declarations (App namespace)
│   ├── app.html                # HTML shell template (SvelteKit entry)
│   ├── lib/                    # Shared library code ($lib alias)
│   │   ├── index.ts            # Barrel file (currently empty placeholder)
│   │   ├── assets/             # Static assets imported by components
│   │   │   └── favicon.svg     # Svelte logo favicon
│   │   ├── avatarShape.ts      # Emoji-based avatar mask generation (canvas API)
│   │   ├── theme.ts            # Theme parsing, token derivation, DOM injection
│   │   ├── components/         # Svelte 5 UI components
│   │   │   ├── ProfileCard.svelte    # User profile display (avatar, banner, bio)
│   │   │   ├── NsiteList.svelte      # List of user's nsite links
│   │   │   ├── ErrorMessage.svelte   # Error display component
│   │   │   └── LoadingSpinner.svelte  # Spinner component (currently unused)
│   │   └── nostr/              # Nostr protocol layer
│   │       ├── store.ts        # EventStore + RelayPool singletons
│   │       ├── bootstrap.ts    # Hostname parsing, relay list, URL builder
│   │       ├── loaders.ts      # Relay subscriptions, event-to-NsiteEntry extraction
│   │       └── cache.ts        # localStorage event persistence
│   └── routes/                 # SvelteKit file-based routing
│       ├── +layout.ts          # Disables SSR and prerendering
│       ├── +layout.svelte      # Root layout (imports CSS, sets favicon)
│       └── +page.svelte        # Main page: orchestrates data loading and rendering
├── static/                     # Files served as-is at root path
│   └── robots.txt              # Search engine directives
├── .nsite/                     # nsite deployment configuration
│   ├── config.json             # Bunker pubkey, relay/server URLs
│   └── named.json              # Named site registry (not committed)
├── dist/                       # Build output (static SPA) - gitignored
├── build/                      # SvelteKit intermediate build output
├── .planning/                  # Planning and documentation
│   └── codebase/               # Codebase analysis documents
├── svelte.config.js            # SvelteKit config (adapter-static, outputs to dist/)
├── vite.config.ts              # Vite config (Tailwind + SvelteKit plugins)
├── tsconfig.json               # TypeScript config (strict mode, bundler resolution)
├── package.json                # Dependencies and scripts
├── package-lock.json           # npm lockfile
├── pnpm-lock.yaml              # pnpm lockfile
├── .npmrc                      # npm configuration
├── .env                        # Environment variables (gitignored)
├── .gitignore                  # Git ignore rules
└── README.md                   # Project documentation
```

## Directory Purposes

**`src/`:**
- Purpose: All application source code
- Contains: TypeScript, Svelte components, CSS, HTML template
- Key files: `app.css`, `app.html`, `app.d.ts`

**`src/lib/`:**
- Purpose: Shared library code accessible via the `$lib` alias
- Contains: Utility modules, components, Nostr protocol layer
- Key files: `index.ts` (empty barrel), `theme.ts`, `avatarShape.ts`

**`src/lib/components/`:**
- Purpose: Reusable Svelte 5 UI components
- Contains: `.svelte` files using runes API (`$props`, `$state`, `$derived`)
- Key files: `ProfileCard.svelte`, `NsiteList.svelte`, `ErrorMessage.svelte`

**`src/lib/nostr/`:**
- Purpose: Nostr protocol interaction layer (relay connections, event handling, caching)
- Contains: TypeScript modules for store management, relay subscriptions, hostname parsing
- Key files: `store.ts` (singletons), `bootstrap.ts` (hostname logic), `loaders.ts` (subscriptions), `cache.ts` (localStorage)

**`src/routes/`:**
- Purpose: SvelteKit file-based routing (single route SPA)
- Contains: Layout and page files
- Key files: `+page.svelte` (main orchestrator), `+layout.svelte` (root layout), `+layout.ts` (SPA config)

**`static/`:**
- Purpose: Files served directly at the root URL path without processing
- Contains: `robots.txt`

**`.nsite/`:**
- Purpose: nsite CLI deployment configuration
- Contains: Bunker connection details, relay/server URLs, named site registry

## Key File Locations

**Entry Points:**
- `src/app.html`: HTML shell template with SvelteKit placeholders
- `src/routes/+layout.ts`: SPA mode configuration (ssr=false, prerender=false)
- `src/routes/+layout.svelte`: Root layout, imports global CSS
- `src/routes/+page.svelte`: Main page, all application logic orchestration

**Configuration:**
- `svelte.config.js`: SvelteKit with adapter-static, output to `dist/`
- `vite.config.ts`: Vite with Tailwind CSS v4 and SvelteKit plugins
- `tsconfig.json`: TypeScript strict mode, extends SvelteKit generated config
- `package.json`: Project metadata, scripts, dependencies
- `.nsite/config.json`: nsite deployment config (bunker, relays, servers)

**Core Logic:**
- `src/lib/nostr/store.ts`: EventStore and RelayPool singleton exports
- `src/lib/nostr/bootstrap.ts`: Hostname-to-pubkey parsing, base36 encoding, URL building
- `src/lib/nostr/loaders.ts`: Relay subscription management, NsiteEntry extraction
- `src/lib/nostr/cache.ts`: localStorage-based event caching with replaceable event dedup
- `src/lib/theme.ts`: Theme event parsing, HSL color math, CSS token derivation, DOM injection
- `src/lib/avatarShape.ts`: Emoji-to-alpha-mask conversion using Canvas API

**Styling:**
- `src/app.css`: Tailwind v4 import, `@theme` directive mapping CSS vars to Tailwind colors, default dark theme tokens

**Testing:**
- No test files exist in the project

## Naming Conventions

**Files:**
- TypeScript modules: `camelCase.ts` (e.g., `avatarShape.ts`, `bootstrap.ts`)
- Svelte components: `PascalCase.svelte` (e.g., `ProfileCard.svelte`, `NsiteList.svelte`)
- SvelteKit route files: `+page.svelte`, `+layout.svelte`, `+layout.ts` (SvelteKit convention)
- CSS: `app.css` (single global file)
- Config files: `lowercase.config.{js,ts}` or `lowercase.json`

**Directories:**
- All lowercase: `components/`, `nostr/`, `assets/`, `routes/`, `lib/`

**Exports:**
- Named exports preferred over default exports
- Singleton instances exported as `const`: `export const eventStore`, `export const pool`
- Interfaces use PascalCase: `NsiteEntry`, `ParsedHost`, `ActiveProfileTheme`
- Functions use camelCase: `parseNpubFromHostname()`, `buildSiteUrl()`, `getNsitesFromStore()`

## Where to Add New Code

**New Svelte Component:**
- Place in: `src/lib/components/`
- Name: `PascalCase.svelte`
- Use Svelte 5 runes: `$props()`, `$state()`, `$derived()`
- Import in consuming component via `$lib/components/ComponentName.svelte`

**New Nostr Protocol Logic:**
- Place in: `src/lib/nostr/`
- For new event kind handling: add parsing functions to `loaders.ts` or create a dedicated module
- For new relay logic: extend `loaders.ts` or add to `bootstrap.ts`
- Always use the singleton `eventStore` and `pool` from `store.ts`

**New Utility / Helper:**
- Place in: `src/lib/` as a standalone TypeScript module
- Name: `camelCase.ts`
- Export named functions and types

**New Route:**
- Place in: `src/routes/{route-name}/+page.svelte`
- Note: This is currently a single-page app; adding routes requires considering whether the SPA fallback pattern still works

**New Static Asset:**
- Importable assets (processed by Vite): `src/lib/assets/`
- Unprocessed files (served at root): `static/`

**New CSS / Styling:**
- Add Tailwind theme tokens in `src/app.css` under the `@theme` block
- Add CSS custom property defaults in the `:root` block of `src/app.css`
- Component-specific styles: use Tailwind utility classes inline in Svelte templates

## Special Directories

**`dist/`:**
- Purpose: Static SPA build output (adapter-static)
- Generated: Yes, by `pnpm build`
- Committed: No (gitignored)
- Deploy: Upload contents to nsite

**`build/`:**
- Purpose: SvelteKit intermediate build artifacts
- Generated: Yes, by `pnpm build`
- Committed: No (gitignored)

**`.svelte-kit/`:**
- Purpose: SvelteKit generated files (types, tsconfig extension)
- Generated: Yes, by `svelte-kit sync`
- Committed: No (gitignored)

**`node_modules/`:**
- Purpose: Installed npm dependencies
- Generated: Yes, by `pnpm install`
- Committed: No (gitignored)

**`.nsite/`:**
- Purpose: nsite CLI deployment configuration
- Generated: Partially (config.json is manual, named.json may be generated)
- Committed: Partially (named.json is not committed per git status)

## Import Path Aliases

- `$lib` maps to `src/lib/` (SvelteKit default)
- Usage: `import { eventStore } from '$lib/nostr/store'`
- No custom aliases beyond the SvelteKit default

## Scripts

```bash
pnpm dev          # Start Vite dev server
pnpm build        # Build static SPA to dist/
pnpm preview      # Preview built output
pnpm check        # Run svelte-check type checking
pnpm check:watch  # Run svelte-check in watch mode
pnpm prepare      # Run svelte-kit sync (generates types)
```

---

*Structure analysis: 2026-04-09*
