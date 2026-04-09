---
status: passed
phase: 04
created: 2026-04-09
---

# Phase 04 — Verification

## Must-Haves

1. Footer displays a link to https://github.com/sandwichfarm/npub-home — **VERIFIED** (grep confirms `href="https://github.com/sandwichfarm/npub-home"` in +page.svelte)
2. When no Ditto theme is set, the page background matches the container background color instead of white — **VERIFIED** (`bg-background` class added to root div, `--background: 228 20% 10%` in app.css)

## Automated Checks

- `pnpm check`: 0 errors, 0 warnings
- `pnpm vitest run`: 63/63 tests pass
- `grep "github.com/sandwichfarm/npub-home" src/routes/+page.svelte`: confirmed
- `grep "bg-background" src/routes/+page.svelte`: confirmed

## Score

2/2 must-haves verified.

## human_verification

None required — both changes are statically verifiable.
