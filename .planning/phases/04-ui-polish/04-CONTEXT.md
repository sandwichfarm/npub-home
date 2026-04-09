# Phase 4: UI Polish - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — no grey areas)

<domain>
## Phase Boundary

Two independent UI fixes: add a GitHub repository link to the footer, and fix the default page background color to match the container instead of white when no Ditto theme is set.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase with no design ambiguity.

- GitHub link: https://github.com/sandwichfarm/npub-home — small text link in footer area
- Background fix: ensure `--background` CSS custom property default matches the container background token

</decisions>

<code_context>
## Existing Code Insights

### Integration Points
- `src/routes/+page.svelte` — footer area already has Login/Logout and nsite-deploy button
- `src/app.css` — `:root` block defines default CSS custom properties including `--background`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
