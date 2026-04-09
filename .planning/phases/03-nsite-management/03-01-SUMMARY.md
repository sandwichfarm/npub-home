---
phase: 03-nsite-management
plan: "01"
subsystem: nostr/loaders + test-scaffold
tags: [nsite, sourceEvent, TDD, wave-0, test-scaffold]
dependency_graph:
  requires: []
  provides: [NsiteEntry.sourceEvent, NsiteList.test.ts wave-0]
  affects: [src/lib/nostr/loaders.ts, src/lib/__tests__/NsiteList.test.ts]
tech_stack:
  added: []
  patterns: [TDD-wave-0, failing-tests-first, nostr-tools-NostrEvent]
key_files:
  created:
    - src/lib/__tests__/NsiteList.test.ts
  modified:
    - src/lib/nostr/loaders.ts
decisions:
  - "sourceEvent field is optional (sourceEvent?: NostrEvent) to preserve backward compatibility with existing call sites"
  - "NsiteList tests use same MockEventFactory constructor pattern as ThemePicker.test.ts for consistency"
  - "13 test cases written (minimum was 10); 3 architecture/non-owner tests pass immediately; 10 UI tests fail as expected"
metrics:
  duration: "117s"
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_modified: 2
---

# Phase 03 Plan 01: NsiteEntry sourceEvent + NsiteList Test Scaffold Summary

NsiteEntry interface extended with optional sourceEvent field and NsiteList Wave 0 TDD tests written covering NSITE-01 through NSITE-04.

## What Was Built

### Task 1: Extend NsiteEntry with sourceEvent (loaders.ts)

Added `sourceEvent?: NostrEvent` to the `NsiteEntry` interface. The existing `import type { NostrEvent } from 'nostr-tools'` at line 2 was already present, so no new imports were needed. Both push sites in `getNsitesFromStore` were updated:

- Kind 15128 root entry: `sourceEvent: root`
- Kind 35128 named entries: `sourceEvent: event`

TypeScript compiles cleanly with no errors. All 36 existing tests continue to pass.

### Task 2: NsiteList Test Scaffold (NsiteList.test.ts)

Created `src/lib/__tests__/NsiteList.test.ts` with 13 test cases organized in three describe blocks:

1. **NSITE-01/02 (edit)**: 6 tests — pencil icon visibility, isOwner=false guard, inline form with pre-populated inputs, Save publishes via EventFactory.modify + pool.publish, writeRelays/BOOTSTRAP_RELAYS relay selection
2. **NSITE-03/04 (delete)**: 5 tests — trash icon visibility, best-effort confirmation text, confirm triggers EventFactory.build + setDeleteEvents + pool.publish, list removal after deletion, "Deletion requested" indicator
3. **Architecture singleton check**: 2 tests — static raw source checks confirming zero imports from `$lib/nostr/store` and `$lib/auth.svelte`

**Test results (expected):**
- 10 tests fail (no edit/delete UI in NsiteList yet — Plan 02 implements this)
- 3 tests pass (isOwner=false guard, singleton arch checks)
- 0 import errors — all mocks and modules resolve cleanly

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `3826af6` | feat(03-01): extend NsiteEntry with sourceEvent field |
| Task 2 | `6ad8c26` | test(03-01): add NsiteList Wave 0 failing tests for NSITE-01 through NSITE-04 |

## Self-Check

Files created/modified:
- [x] `src/lib/nostr/loaders.ts` — modified, sourceEvent field present
- [x] `src/lib/__tests__/NsiteList.test.ts` — created, 449 lines

Commits:
- [x] `3826af6` — feat(03-01) loaders.ts change
- [x] `6ad8c26` — test(03-01) NsiteList.test.ts creation
