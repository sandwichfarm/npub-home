# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-09)

**Core value:** Show a Nostr user's nsites in one place, styled with their profile theme, with zero configuration for visitors.
**Current focus:** Phase 1 — Auth

## Current Position

Phase: 1 of 4 (Auth)
Plan: 0 of ? in current phase
Status: Ready to plan
Last activity: 2026-04-09 — Roadmap created, 4 phases defined, all 19 v1 requirements mapped

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Login link goes in the footer (small, not prominent — only useful for site owner)
- [Init]: Theme picker is a modal dialog; must be extractable as standalone component (props-only design, no singleton imports)
- [Init]: NIP-07 + NIP-46 dual support; NIP-46 requires editable relay field that updates URI and QR live
- [Init]: NIP-09 deletion is advisory — UI must label it "Request deletion" with best-effort explanation

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: NIP-46 three-keypair confusion risk — always call `await signer.getPublicKey()` after connect; never use bunker URI pubkey as signing identity
- [Phase 1]: BunkerPointer serialization for localStorage persistence — verify from NostrConnectSigner source during implementation
- [Phase 2]: Kind 36767 curated theme sources (relay endpoints / event IDs) not yet identified — survey bootstrap relays during Phase 2 planning
- [Phase 2]: CSS injection sanitization for `font.family` values from kind 16767 events must be addressed in publisher/theme layer

## Session Continuity

Last session: 2026-04-09
Stopped at: Roadmap created and written to disk; REQUIREMENTS.md traceability updated
Resume file: None
