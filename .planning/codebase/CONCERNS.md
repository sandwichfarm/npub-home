# Codebase Concerns

**Analysis Date:** 2026-04-09

## Tech Debt

**No Test Suite at All:**
- Issue: Zero test files exist in the project. No test framework configured, no test runner, no test scripts in `package.json`.
- Files: Entire codebase (`src/`)
- Impact: Any refactor or feature addition risks silent regressions. Critical logic in `src/lib/theme.ts` (color parsing, HSL conversion, token derivation) and `src/lib/nostr/bootstrap.ts` (hostname parsing, base36 encoding) is pure-function heavy and highly testable but completely untested.
- Fix approach: Add vitest (already compatible with vite/sveltekit). Priority test targets: `parseHsl`, `hslToRgb`, `rgbToHsl`, `hexToHslString`, `deriveTokens`, `parseActiveProfileTheme` in `src/lib/theme.ts`; `pubkeyToBase36`, `base36ToPubkey`, `parseNpubFromHostname`, `buildSiteUrl` in `src/lib/nostr/bootstrap.ts`; `cacheEvent`, `loadCachedEvents`, `isReplaceable`, `replacementKey` in `src/lib/nostr/cache.ts`.

**No Linting or Formatting Config:**
- Issue: No ESLint, Prettier, or Biome configuration files exist. No lint or format scripts in `package.json`.
- Files: Project root
- Impact: Code style drift over time. No automated enforcement of conventions. Inconsistent indentation already visible (mixed tabs/spaces in `src/lib/nostr/loaders.ts` lines 47, 62-63).
- Fix approach: Add eslint + prettier configs or biome.json. Add lint script to `package.json`.

**Module-Level Mutable Singleton State:**
- Issue: `activePubkey` in `src/lib/nostr/loaders.ts` is a module-scoped mutable `let` variable, and `eventStore`/`pool` in `src/lib/nostr/store.ts` are module-scoped singletons. This works for a single-page app but is fragile -- if any future SSR or multi-instance scenario arises, state leaks between contexts.
- Files: `src/lib/nostr/loaders.ts` (line 14), `src/lib/nostr/store.ts` (lines 4-5)
- Impact: Currently safe because SSR is disabled (`src/routes/+layout.ts` exports `ssr = false`). Would break immediately if SSR were enabled. The `activePubkey` variable is never reset on cleanup, so if `subscribe()` were called again for a different pubkey, stale state from the previous call could persist.
- Fix approach: Reset `activePubkey` to `undefined` in the cleanup function returned by `subscribe()`. Consider using Svelte context or a factory pattern if multi-instance support is ever needed.

**Inner Subscription Not Cleaned Up (Memory/Connection Leak):**
- Issue: In `src/lib/nostr/loaders.ts` lines 58-66, relay discovery creates new `pool.req()` subscriptions inside an RxJS subscriber callback, but these inner subscriptions are never tracked or cleaned up. When the outer `relayDiscoverySub` is unsubscribed, the inner relay subscriptions remain active, keeping WebSocket connections open.
- Files: `src/lib/nostr/loaders.ts` (lines 55-67)
- Impact: Each relay list event spawns a new subscription that persists indefinitely. In practice, since this is a single-page app that only runs once, the leak is limited to the page session. But if events re-arrive (e.g., from cache + live), duplicate subscriptions accumulate.
- Fix approach: Track inner subscriptions in an array and unsubscribe them all in the cleanup function. Alternatively, use RxJS `switchMap` or `mergeMap` with `takeUntil` to compose the inner observable properly.

## Security Considerations

**CSS Injection via Nostr Event Data (Theme Application):**
- Risk: `src/lib/theme.ts` lines 286-299 interpolate user-provided strings directly into CSS via `textContent`. The `font.family`, `font.url`, and `background.url` values come from Nostr events (kind 16767) authored by the profile owner. While `textContent` prevents HTML injection, a malicious font URL or background URL could reference a tracking pixel. A crafted `font.family` containing CSS-breaking characters (e.g., `'; }`) could corrupt the stylesheet.
- Files: `src/lib/theme.ts` (lines 286-300)
- Current mitigation: Values are set via `element.textContent`, which is safer than `innerHTML`. Only the profile owner's events are parsed.
- Recommendations: Sanitize `font.family` to alphanumeric + spaces only. Validate that `font.url` and `background.url` are valid HTTPS URLs. Consider using `CSS.escape()` for font family names.

**CSS Injection via Emoji Mask URL in Profile Card:**
- Risk: `src/lib/components/ProfileCard.svelte` line 22 interpolates `maskUrl` (a data URL from canvas) into inline CSS. This is currently safe because `maskUrl` is generated locally by `getEmojiMaskUrl()` in `src/lib/avatarShape.ts`. However, if the mask URL source ever changes to accept external URLs, it would become injectable.
- Files: `src/lib/components/ProfileCard.svelte` (line 22)
- Current mitigation: URL is always a locally-generated `data:image/png` URL.
- Recommendations: Add a validation guard that `maskUrl` starts with `data:image/png` before interpolation.

**No Content Security Policy (CSP):**
- Risk: The `src/app.html` template has no CSP meta tag or headers. The app loads external fonts (from Nostr theme events), external images (profile pictures, banners, background images), and dynamically creates `<style>` elements. Without CSP, the app is more vulnerable to future injection issues.
- Files: `src/app.html`
- Current mitigation: None.
- Recommendations: Add a CSP meta tag or configure CSP headers at the hosting level. At minimum, restrict `script-src` to `'self'`.

**Untracked `.nsite/named.json` in Working Directory:**
- Risk: `.nsite/config.json` contains a `bunkerPubkey` and relay configuration. This directory is not gitignored but `named.json` appears as an untracked file. If committed, it could expose deployment configuration.
- Files: `.nsite/config.json`, `.nsite/named.json`
- Current mitigation: `.nsite/` files are not yet committed (only `named.json` shows in `git status` as untracked).
- Recommendations: Add `.nsite/` to `.gitignore` if it contains environment-specific deployment config.

## Performance Bottlenecks

**Emoji Canvas Rendering on Main Thread:**
- Problem: `getEmojiMaskUrl()` in `src/lib/avatarShape.ts` creates a 768x768 canvas, draws an emoji, iterates over every pixel to find bounds, creates a second 256x256 canvas, and iterates again to build an alpha mask -- all synchronously on the main thread.
- Files: `src/lib/avatarShape.ts` (lines 34-109)
- Cause: Full pixel-level iteration of 768x768 canvas (589,824 pixels, each checked in a nested loop) followed by a second 256x256 canvas iteration (65,536 pixels). The result is cached in memory, so it only runs once per emoji.
- Improvement path: Move to `OffscreenCanvas` in a Web Worker, or pre-generate common emoji masks at build time. The in-memory cache mitigates repeated calls, but first render still blocks.

**localStorage Cache Grows Without Bounds:**
- Problem: `cacheEvent()` in `src/lib/nostr/cache.ts` appends events to localStorage indefinitely. There is no eviction policy, size limit, or TTL.
- Files: `src/lib/nostr/cache.ts` (lines 10-28)
- Cause: Every event received from relays is cached. For profiles with many kind 35128 events (named sites), the cache grows linearly.
- Improvement path: Add a maximum event count per pubkey (e.g., 100). Implement LRU eviction. Consider using IndexedDB for larger datasets.

**Full Event List Re-parse on Every Event:**
- Problem: In `src/lib/nostr/cache.ts`, `cacheEvent()` calls `loadCachedEvents()` (which parses the entire JSON array from localStorage) on every single incoming event, then re-serializes the entire array back.
- Files: `src/lib/nostr/cache.ts` (lines 10-28)
- Cause: No batching of cache writes. Each event triggers a full parse-modify-serialize cycle.
- Improvement path: Batch cache writes with a debounced flush, or keep an in-memory mirror and only persist periodically.

**Redundant Event Store Queries in Theme Subscription:**
- Problem: In `src/routes/+page.svelte` lines 56-72, the theme subscription callback fires on every kind 16767 event change, then separately calls `eventStore.getByFilters()` to re-query all theme events, sorts them, and re-applies the theme. The subscription itself already provides the events.
- Files: `src/routes/+page.svelte` (lines 56-72)
- Cause: The callback ignores its `events` parameter and re-queries the store.
- Improvement path: Use the events provided by the subscription callback directly instead of re-querying.

## Fragile Areas

**Hostname Parsing Logic:**
- Files: `src/lib/nostr/bootstrap.ts` (lines 33-71)
- Why fragile: `parseNpubFromHostname()` handles multiple formats (npub subdomain, base36 named site, localhost dev mode) with implicit priority ordering. The base36 regex (`NAMED_SITE_REGEX`) is complex and the 63-character max aligns with DNS label limits but is not documented. Edge cases around port numbers, multi-level subdomains, and IPv6 are not handled.
- Safe modification: Add comprehensive unit tests for all hostname patterns before changing. Document the expected hostname formats. Test with multi-level subdomains and port numbers.
- Test coverage: None.

**`buildSiteUrl()` Protocol Assumption:**
- Files: `src/lib/nostr/bootstrap.ts` (lines 85-118)
- Why fragile: Line 109 assumes `http` for URLs with ports and `https` for URLs without. This heuristic breaks for production environments behind non-standard ports or reverse proxies. The function also splits on `:` to separate host and port, which would fail with IPv6 addresses.
- Safe modification: Accept protocol as a parameter, or detect from `window.location.protocol`.
- Test coverage: None.

**Theme Color Parsing:**
- Files: `src/lib/theme.ts` (lines 166-255)
- Why fragile: `parseActiveProfileTheme()` handles two different data formats (tag-based and legacy JSON content). The tag format expects specific tag structures (`c` tags with 3 elements, `f` tags, `bg` tags with space-separated key-value pairs). Malformed events could cause unexpected behavior. The `parseHsl()` function (line 45) does no validation -- if a non-numeric string is passed, `Number()` returns `NaN` which propagates silently through all color calculations.
- Safe modification: Add input validation in `parseHsl()`. Add unit tests for both tag-based and JSON content formats.
- Test coverage: None.

## Scaling Limits

**localStorage Capacity (~5-10MB):**
- Current capacity: All cached Nostr events for a pubkey stored as JSON in a single localStorage key.
- Limit: localStorage is typically capped at 5-10MB per origin. A profile with many events or large event content will silently fail to cache (the `catch` block in `cacheEvent` swallows the error).
- Scaling path: Migrate to IndexedDB for event caching, which has much higher storage limits.

**Single RelayPool Instance:**
- Current capacity: One global `RelayPool` managing connections to bootstrap relays + discovered user relays.
- Limit: The pool opens WebSocket connections to all discovered relays. If a user's relay list is large, this could open many connections simultaneously.
- Scaling path: Limit the number of concurrent relay connections. Prioritize relays by response time or reliability.

## Dependencies at Risk

**`@nsite/stealthis` (0.2.0 installed, 0.7.0 available):**
- Risk: Major version gap (0.2.0 vs 0.7.0). The `0.x` semver range means any minor bump can include breaking changes. The package is dynamically imported in `src/routes/+page.svelte` line 20 and used as a web component (`<nsite-deploy>`).
- Impact: Currently functional but missing 5 minor versions of updates. API surface may have changed significantly.
- Migration plan: Review 0.7.0 changelog, test upgrade in isolation.

**`vite` (7.3.1 installed, 8.0.8 available):**
- Risk: Major version available (8.x). Current version works but will eventually fall behind ecosystem support.
- Impact: Low immediate risk. May block adoption of newer SvelteKit versions that require Vite 8.
- Migration plan: Wait for `@sveltejs/kit` to officially support Vite 8, then upgrade together.

**`@sveltejs/vite-plugin-svelte` (6.2.4 installed, 7.0.0 available):**
- Risk: Major version available (7.x). Likely tied to the Vite 8 upgrade path.
- Impact: Low immediate risk.
- Migration plan: Upgrade alongside Vite 8 when SvelteKit supports it.

## Missing Critical Features

**No Loading State:**
- Problem: `LoadingSpinner.svelte` exists as a component but is never used. When the page loads, there is no loading indicator while profile data and nsite lists are being fetched from relays.
- Blocks: Users see an empty card with "Profile not found" text until events arrive from relays, which can take several seconds.
- Files: `src/lib/components/LoadingSpinner.svelte` (unused), `src/routes/+page.svelte`

**No Error Handling for Relay Failures:**
- Problem: If all bootstrap relays are unreachable or return errors, there is no user-facing feedback. The `pool.req()` observable in `src/lib/nostr/loaders.ts` has no error handler.
- Blocks: Users on flaky networks see a permanently blank page with no explanation.
- Files: `src/lib/nostr/loaders.ts` (lines 41-49)

**No Meta Tags for SEO/Social Sharing:**
- Problem: The `<svelte:head>` in `src/routes/+page.svelte` only sets `<title>`. No Open Graph, Twitter Card, or description meta tags are present. Since SSR is disabled, crawlers see an empty page.
- Blocks: Social media link previews show no information. Search engine indexing is minimal.
- Files: `src/routes/+page.svelte` (lines 84-86), `src/app.html`

**No Accessibility Attributes:**
- Problem: No ARIA labels, roles, or accessibility attributes anywhere in the component tree. Images have `alt` attributes, which is good, but interactive elements and the overall page structure lack semantic accessibility markup.
- Files: `src/lib/components/ProfileCard.svelte`, `src/lib/components/NsiteList.svelte`

## Test Coverage Gaps

**All Business Logic Untested:**
- What's not tested: Every function in the codebase. Critical pure functions include:
  - HSL/RGB/Hex color conversion pipeline (`src/lib/theme.ts`)
  - Nostr event parsing for theme data (`src/lib/theme.ts`)
  - Token derivation from theme colors (`src/lib/theme.ts`)
  - Hostname to pubkey parsing (`src/lib/nostr/bootstrap.ts`)
  - Base36 pubkey encoding/decoding (`src/lib/nostr/bootstrap.ts`)
  - Site URL construction (`src/lib/nostr/bootstrap.ts`)
  - Event caching with replaceable event deduplication (`src/lib/nostr/cache.ts`)
  - Nsite list extraction from event store (`src/lib/nostr/loaders.ts`)
  - Emoji detection and avatar shape extraction (`src/lib/avatarShape.ts`)
- Files: All `src/lib/**/*.ts` files
- Risk: Any change to color math, URL construction, or event parsing could silently break core functionality.
- Priority: High -- these are pure functions that are trivial to test and form the backbone of the app.

---

*Concerns audit: 2026-04-09*
