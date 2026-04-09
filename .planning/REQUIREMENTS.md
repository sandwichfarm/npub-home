# Requirements: npub-home

**Defined:** 2026-04-09
**Core Value:** Show a Nostr user's nsites in one place, styled with their profile theme, with zero configuration for visitors.

## v1 Requirements

### Authentication

- [x] **AUTH-01**: User can log in via NIP-07 browser extension (window.nostr)
- [x] **AUTH-02**: User can log in via NIP-46 by pasting a bunker URI
- [x] **AUTH-03**: User can log in via NIP-46 by scanning a nostrconnect:// QR code
- [x] **AUTH-04**: User can modify the default relay used for NIP-46 bunker connection, which updates both the QR code and bunker URI live
- [x] **AUTH-05**: Logged-in user's pubkey is compared to the site npub to detect owner status
- [x] **AUTH-06**: Login state persists across page refreshes (session survives reload)
- [x] **AUTH-07**: User can log out

### Theme Management

- [ ] **THEME-01**: Owner can open a theme picker modal dialog
- [ ] **THEME-02**: Theme picker displays a list of curated kind 36767 themes
- [ ] **THEME-03**: Owner can paste nevent references to add custom themes to the picker list
- [ ] **THEME-04**: Owner can preview a theme before applying (live preview using existing applyTheme infrastructure)
- [ ] **THEME-05**: Owner can publish a selected theme as their active profile theme (kind 16767)
- [ ] **THEME-06**: Theme picker is built as a well-separated component (receives signer as prop, no app singleton imports) suitable for future extraction as standalone package

### Nsite Management

- [ ] **NSITE-01**: Owner can edit the name of an existing nsite (republish kind 35128 or 15128 event with updated metadata)
- [ ] **NSITE-02**: Owner can edit the description of an existing nsite (republish kind 35128 or 15128 event with updated metadata)
- [ ] **NSITE-03**: Owner can request deletion of an nsite via NIP-09 (kind 5 deletion event)
- [ ] **NSITE-04**: Deletion UI clearly communicates that deletion is best-effort/advisory

### UI Polish

- [ ] **UI-01**: Footer displays a link to the GitHub repository (https://github.com/sandwichfarm/npub-home)
- [ ] **UI-02**: Default page background color matches the container background when no Ditto theme is set (instead of white)

## v2 Requirements

### Authentication

- **AUTH-V2-01**: Support additional NIP-46 encryption methods (NIP-44) when remote signers adopt it

### Theme Management

- **THEME-V2-01**: Owner can create custom themes from scratch (color picker for background/text/primary)
- **THEME-V2-02**: Owner can publish shareable kind 36767 theme definitions
- **THEME-V2-03**: Theme picker published as standalone npm package

### Nsite Management

- **NSITE-V2-01**: Owner can reorder nsites on the page
- **NSITE-V2-02**: Owner can create new nsite entries (not just manage existing)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend or API server | Fully client-side SPA by design |
| User registration/signup | Identity comes from Nostr keys, not accounts |
| Visitor-facing login features | Login only useful for site owner |
| Mobile app | Web-only SPA |
| SSR/SEO | Static SPA deployed via nsite protocol |
| Full theme editor (color pickers) | Deferred to v2 — v1 selects from existing themes |
| Creating new nsites | Only managing existing entries in v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| AUTH-07 | Phase 1 | Complete |
| THEME-01 | Phase 2 | Pending |
| THEME-02 | Phase 2 | Pending |
| THEME-03 | Phase 2 | Pending |
| THEME-04 | Phase 2 | Pending |
| THEME-05 | Phase 2 | Pending |
| THEME-06 | Phase 2 | Pending |
| NSITE-01 | Phase 3 | Pending |
| NSITE-02 | Phase 3 | Pending |
| NSITE-03 | Phase 3 | Pending |
| NSITE-04 | Phase 3 | Pending |
| UI-01 | Phase 4 | Pending |
| UI-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 after roadmap creation*
