---
phase: 1
slug: auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (not yet installed — Wave 0) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `pnpm vitest run --reporter=verbose` |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run --reporter=verbose`
- **After every plan wave:** Run `pnpm vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | — | setup | `pnpm vitest run` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | AUTH-01 | unit | `pnpm vitest run src/lib/auth` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | AUTH-02, AUTH-03 | unit | `pnpm vitest run src/lib/auth` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 1 | AUTH-05 | unit | `pnpm vitest run src/lib/auth` | ❌ W0 | ⬜ pending |
| 1-02-04 | 02 | 1 | AUTH-06 | unit | `pnpm vitest run src/lib/auth` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | AUTH-01..07 | manual | browser | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` + `@testing-library/svelte` — install test framework
- [ ] `vitest.config.ts` — configure for SvelteKit/Svelte 5
- [ ] `src/lib/__tests__/auth.test.ts` — test stubs for auth singleton

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| NIP-07 extension login | AUTH-01 | Requires browser extension | Open page, click Login, click Extension tab, click Connect Extension |
| NIP-46 bunker URI paste | AUTH-02 | Requires running remote signer | Open page, click Login, click Remote Signer tab, paste bunker URI |
| NIP-46 QR code scan | AUTH-03 | Requires mobile signer app | Open page, click Login, see QR code, scan with signer app |
| Relay field live update | AUTH-04 | Visual verification of QR/URI change | Edit relay field, observe QR code and URI update in real time |
| Owner indicator appears | AUTH-05 | Visual check | After login, verify footer shows owner badge and Logout link |
| Session survives reload | AUTH-06 | Browser state | Login, refresh page, verify still logged in |
| Logout works | AUTH-07 | UI interaction | Click Logout, verify management UI disappears, Login reappears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
