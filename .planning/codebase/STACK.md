# Technology Stack

**Analysis Date:** 2026-04-09

## Languages

**Primary:**
- TypeScript 5.9.3 - All application logic (`src/lib/**/*.ts`, `src/routes/**/*.svelte`)
- Svelte 5.51.0 - Component templates using Svelte 5 runes syntax (`$props()`, `$state()`, `$derived()`)

**Secondary:**
- CSS - Tailwind CSS v4 with custom theme tokens (`src/app.css`)
- HTML - SvelteKit app shell (`src/app.html`)

## Runtime

**Environment:**
- Node.js 22.22.1 (system)
- Browser-only SPA at runtime (SSR disabled in `src/routes/+layout.ts`: `export const ssr = false`)

**Package Manager:**
- pnpm (lockfile version 9.0)
- Lockfile: `pnpm-lock.yaml` present
- Note: `package-lock.json` also exists (legacy/unused)

## Frameworks

**Core:**
- SvelteKit 2.50.2 - Application framework (`svelte.config.js`, `vite.config.ts`)
- Svelte 5.51.0 - Component framework using runes mode (NOT legacy `$:` reactivity)
- Tailwind CSS 4.2.1 - Utility-first CSS via Vite plugin (`@tailwindcss/vite`)

**Build/Dev:**
- Vite 7.3.1 - Build tool and dev server (`vite.config.ts`)
- `@sveltejs/adapter-static` 3.0.10 - Static SPA output to `dist/` with `index.html` fallback (`svelte.config.js`)
- `@sveltejs/vite-plugin-svelte` 6.2.4 - Svelte compilation for Vite
- `svelte-check` 4.4.2 - Type checking

**Testing:**
- Not configured. No test framework, no test files.

## Key Dependencies

**Critical (runtime):**
- `applesauce-core` 5.1.0 - Nostr EventStore for reactive event management. Provides `EventStore` class and profile helpers. Used in `src/lib/nostr/store.ts` and `src/routes/+page.svelte`.
- `applesauce-relay` 5.1.0 - Nostr relay connection pool built on RxJS. Provides `RelayPool` class. Used in `src/lib/nostr/store.ts`.
- `nostr-tools` 2.23.3 - Nostr protocol utilities (NIP-19 npub encoding/decoding). Used in `src/lib/nostr/bootstrap.ts` and type definitions throughout.
- `rxjs` 7.8.2 - Reactive streams for relay subscriptions. Used in `src/lib/nostr/loaders.ts` (pipe/filter operators).
- `@nsite/stealthis` 0.2.0 - Web component for "steal this nsite" button. Dynamically imported in `src/routes/+page.svelte` via `import('@nsite/stealthis')`. Renders `<nsite-deploy>` custom element.

**Infrastructure:**
- `@tailwindcss/vite` 4.2.1 - Tailwind CSS Vite plugin (replaces PostCSS-based approach from v3)

## Configuration

**Environment:**
- `.env` file present (contains `VITE_DEV_NPUB` for local development)
- Only one env var used: `VITE_DEV_NPUB` - accessed via `import.meta.env.VITE_DEV_NPUB` in `src/lib/nostr/bootstrap.ts`
- In production, the npub is parsed from the hostname (no env vars needed)

**TypeScript:**
- `tsconfig.json` - Extends SvelteKit generated config
- Strict mode enabled
- Module resolution: `bundler`
- Path alias: `$lib` maps to `src/lib/` (SvelteKit default)

**Build:**
- `svelte.config.js` - Static adapter outputting to `dist/` directory
- `vite.config.ts` - Tailwind CSS plugin + SvelteKit plugin
- Output: Static SPA with `index.html` fallback (SPA routing)
- No SSR, no prerendering (`src/routes/+layout.ts`)

**Deployment:**
- `.nsite/` directory contains nsite deployment config
- `.nsite/named.json` - Named site configuration (bunker pubkey, relays, blossom servers)
- Deployed via nsite protocol to Nostr relay infrastructure

## Platform Requirements

**Development:**
- Node.js 22+ (ES modules, modern APIs)
- pnpm package manager
- `.env` file with `VITE_DEV_NPUB=npub1...` for localhost testing

**Production:**
- Static file hosting (outputs to `dist/`)
- Deployed as an nsite (Nostr-based website hosting)
- Requires hostname in format `npub1xxx.nsite-host.com` or `<base36pubkey><dtag>.nsite-host.com`

## Scripts

```bash
pnpm dev          # Start Vite dev server
pnpm build        # Build static SPA to dist/
pnpm preview      # Preview built site
pnpm check        # Run svelte-check type checking
pnpm check:watch  # Type checking in watch mode
pnpm prepare      # SvelteKit sync (runs on install)
```

---

*Stack analysis: 2026-04-09*
