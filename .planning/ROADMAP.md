# Roadmap: npub-home

## Overview

npub-home adds an owner management layer on top of an existing public Nostr profile viewer. The work proceeds in strict dependency order: auth foundation first (everything gates on login and owner detection), then the theme picker (the milestone's differentiating feature), then nsite management (edit and delete), then UI polish (independent quick wins). Each phase ships as its own PR on a separate branch.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Auth** - Working login (NIP-07 + NIP-46), owner detection, and persistent session
- [ ] **Phase 2: Theme Picker** - Owner can browse, preview, and publish themes via an isolated modal component
- [ ] **Phase 3: Nsite Management** - Owner can edit nsite name/description and request deletion via NIP-09
- [ ] **Phase 4: UI Polish** - GitHub footer link and default background color fix

## Phase Details

### Phase 1: Auth
**Goal**: The site owner can log in, be recognized as owner, and stay logged in across reloads
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07
**Success Criteria** (what must be TRUE):
  1. Owner can click a small login link in the footer and log in via NIP-07 browser extension in one click
  2. Owner can log in via NIP-46 by pasting a bunker URI or scanning a nostrconnect:// QR code, with an editable relay field that updates both the URI and QR code live
  3. After login, the page shows owner-only management UI without reloading; visitors see none of it
  4. Refreshing the page after login keeps the owner logged in (session survives reload)
  5. Owner can log out from any page state and the management UI disappears
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Install deps (applesauce-signers, lean-qr) and stand up vitest test infrastructure
- [ ] 01-02-PLAN.md — Implement auth.svelte.ts reactive singleton (NIP-07, NIP-46 bunker, owner detection, session, logout)
- [ ] 01-03-PLAN.md — Build LoginModal, ExtensionTab, RemoteSignerTab (QR canvas + relay live-update)
- [ ] 01-04-PLAN.md — Wire auth into +page.svelte: restoreSession, LoginModal, OwnerBadge, footer Login/Logout
**UI hint**: yes

### Phase 2: Theme Picker
**Goal**: Owner can browse curated themes, preview them live, add custom themes by nevent reference, and publish one as their active profile theme
**Depends on**: Phase 1
**Requirements**: THEME-01, THEME-02, THEME-03, THEME-04, THEME-05, THEME-06
**Success Criteria** (what must be TRUE):
  1. Owner can open a theme picker modal from the page and see a list of curated kind 36767 themes
  2. Clicking a theme in the picker immediately previews it on the live page without publishing
  3. Owner can paste a nevent reference into the picker and the referenced theme is added to the list
  4. Owner can confirm a selection and the theme is published as kind 16767 to their NIP-65 write relays
  5. ThemePicker.svelte has no singleton imports — signer, relays, and pool are received as props only
**Plans**: TBD
**UI hint**: yes

### Phase 3: Nsite Management
**Goal**: Owner can edit the name and description of existing nsites and request deletion via NIP-09
**Depends on**: Phase 1
**Requirements**: NSITE-01, NSITE-02, NSITE-03, NSITE-04
**Success Criteria** (what must be TRUE):
  1. Owner can edit an nsite's name inline and the updated kind 35128/15128 event is published to their write relays
  2. Owner can edit an nsite's description inline and the change is published the same way
  3. Owner can trigger deletion of an nsite and a kind 5 NIP-09 event is published
  4. The deletion UI labels the action "Request deletion" and explains the best-effort nature before confirming
**Plans**: TBD
**UI hint**: yes

### Phase 4: UI Polish
**Goal**: Footer shows the GitHub repository link and the default background color no longer flashes white before theme loads
**Depends on**: Nothing (independent)
**Requirements**: UI-01, UI-02
**Success Criteria** (what must be TRUE):
  1. Footer displays a link to https://github.com/sandwichfarm/npub-home visible to all visitors
  2. When no Ditto theme is set, the page background matches the container background color instead of white
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth | 1/4 | In Progress|  |
| 2. Theme Picker | 0/? | Not started | - |
| 3. Nsite Management | 0/? | Not started | - |
| 4. UI Polish | 0/? | Not started | - |
