# Testing Patterns

**Analysis Date:** 2026-04-09

## Test Framework

**Runner:**
- None configured. No test framework is installed or configured in this project.
- No `vitest`, `jest`, `playwright`, or any other test runner in `package.json` dependencies.
- No test configuration files exist (`vitest.config.*`, `jest.config.*`, `playwright.config.*`).

**Assertion Library:**
- None

**Run Commands:**
```bash
npm run check              # Type-check with svelte-check (NOT tests)
npm run check:watch        # Type-check in watch mode
```

There are no `test` or `test:*` scripts in `package.json`.

## Test File Organization

**Location:**
- No test files exist anywhere in the project.
- No `*.test.ts`, `*.spec.ts`, `*.test.svelte`, or `__tests__/` directories found.

## Type Checking as Validation

The only automated validation is TypeScript type checking via `svelte-check`:

```bash
npm run check    # Runs: svelte-kit sync && svelte-check --tsconfig ./tsconfig.json
```

TypeScript is configured with `strict: true` in `tsconfig.json`, which provides:
- Strict null checks
- No implicit any
- Strict function types

## Coverage

**Requirements:** None enforced
**Tool:** None configured

## Test Types

**Unit Tests:**
- Not present. No unit tests for any of the utility modules (`theme.ts`, `avatarShape.ts`, `bootstrap.ts`, `cache.ts`).

**Integration Tests:**
- Not present.

**E2E Tests:**
- Not present.

**Component Tests:**
- Not present.

## What Should Be Tested (Recommendations)

If adding tests, the recommended framework is **Vitest** (already compatible with the Vite build system).

**High-value test targets:**

1. **`src/lib/nostr/bootstrap.ts`** - Pure functions ideal for unit testing:
   - `pubkeyToBase36()` / `base36ToPubkey()` - encoding roundtrip
   - `parseNpubFromHostname()` - hostname parsing logic with multiple formats
   - `buildSiteUrl()` - URL construction from parts

2. **`src/lib/theme.ts`** - Color utility functions are pure and testable:
   - `parseHsl()`, `hexToHslString()` - color parsing
   - `isDarkTheme()` - theme detection
   - `deriveTokens()` - token derivation
   - `parseActiveProfileTheme()` - event parsing

3. **`src/lib/avatarShape.ts`** - `isEmoji()` and `getAvatarShape()` are pure functions

4. **`src/lib/nostr/cache.ts`** - localStorage caching logic (would need mock)

**Setup would require:**
```bash
npm install -D vitest @testing-library/svelte jsdom
```

**Suggested vitest config (`vite.config.ts` addition):**
```typescript
export default defineConfig({
    plugins: [tailwindcss(), sveltekit()],
    test: {
        include: ['src/**/*.test.ts'],
        environment: 'jsdom'
    }
});
```

**Suggested test file placement:** Co-located with source files:
```
src/lib/nostr/bootstrap.test.ts
src/lib/theme.test.ts
src/lib/avatarShape.test.ts
```

## CI/CD Integration

**CI Pipeline:** None configured
- No `.github/workflows/` directory
- No GitLab CI, CircleCI, or other CI config files
- Deployment appears to be via `nsite` (Nostr-based site publishing) based on `.nsite/config.json`

---

*Testing analysis: 2026-04-09*
