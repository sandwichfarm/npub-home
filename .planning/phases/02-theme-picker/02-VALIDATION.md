---
phase: 2
slug: theme-picker
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.4 + @testing-library/svelte 5.3.1 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm vitest run src/lib/__tests__/theme.test.ts` |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run src/lib/__tests__/theme.test.ts`
- **After every plan wave:** Run `pnpm vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | THEME-02, THEME-03 | unit | `pnpm vitest run src/lib/__tests__/theme.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 2 | THEME-02, THEME-04, THEME-05 | unit (component) | `pnpm vitest run src/lib/__tests__/ThemePicker.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 2 | THEME-03, THEME-04, THEME-05, THEME-06 | unit (component) | `pnpm vitest run src/lib/__tests__/ThemePicker.test.ts` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 3 | THEME-01 | unit (component) | `pnpm vitest run src/lib/__tests__/OwnerBadge.test.ts` | ❌ W0 | ⬜ pending |
| 2-03-02 | 03 | 3 | THEME-01..06 | manual | browser | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/theme.test.ts` — tests for parseThemeDefinition + decodeNeventInput (THEME-02, THEME-03)
- [ ] `src/lib/__tests__/ThemePicker.test.ts` — component tests for preview, publish, no-singleton (THEME-04, THEME-05, THEME-06)
- [ ] `src/lib/__tests__/OwnerBadge.test.ts` — Theme button visibility test (THEME-01)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Curated themes load from relays | THEME-02 | Requires live relay connections | Open page as owner, click Theme button, verify curated list loads |
| Live preview applies theme visually | THEME-04 | Visual verification | Click a theme card, observe page colors change instantly |
| nevent paste adds theme to list | THEME-03 | Requires valid nevent reference | Paste a kind 36767 nevent, verify theme appears in list |
| Publishing updates active theme | THEME-05 | Requires signer + relay write | Click Apply Theme, verify kind 16767 event published |
| QR/relay field from Phase 1 still works | AUTH-03, AUTH-04 | Regression check | Open login, verify QR code + relay field function |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
