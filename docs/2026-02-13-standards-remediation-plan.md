# 2026-02-13 Standards Remediation Plan

## Scope

### In
- Add required file headers to all TS/JS files missing them
- Remove all emoji/glyphs (violates Windows UTF-8 clean standard)
- Replace all hallucinated/placeholder farm content with real data from FARM.md
- Replace fake product seed data with real egg products from FARM.md
- Ensure every file complies with Mark's Coding Standards and CLAUDE.md

### Out
- Config files that cannot support comments (JSON, etc.) -- no headers needed
- HTML, CSS, declaration (.d.ts) files -- no code headers
- No new features or architecture changes

## Architecture
- No structural changes; this is a content and standards compliance fix
- All edits are in-place corrections to existing files

## TODOs (ordered)
1. Add missing headers: lib/utils.ts, ui/button.tsx, ui/card.tsx, ui/badge.tsx, ui/separator.tsx
2. Remove emoji/glyphs from: server/index.ts, scripts/seed-products.ts
3. Replace hallucinated Home.tsx content with real FARM.md data (birds, eggs, dogs, location)
4. Replace fake seed-products.ts data with real products (blue eggs, hatching eggs, farm mix)
5. Audit all remaining files for header compliance and placeholder content
6. Update CHANGELOG.md
7. Verify build compiles

## Docs/Changelog touchpoints
- CHANGELOG.md: new entry for standards remediation
