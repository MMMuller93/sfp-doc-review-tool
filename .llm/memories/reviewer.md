# Reviewer Agent Memory

Learnings specific to the Reviewer agent.

---

## Quality Ledger — Doc Review Tool v2 Rebuild

> Running audit trail across all phases. Each gate review gets an entry.

### 2026-02-20: Rebuild Plan Approved
- **Phase**: Pre-implementation
- **Status**: Stress-tested plan written to `Doc Review Tool/project_state.md`
- **Key decisions locked**: 7 architectural decisions, all verified via POC or research
- **Model strategy**: GPT-5.2 analyze → Sonnet 4.6 review → Haiku 4.5 classify
- **DO NOT DO rules**: 10 rules established
- **Next gate**: Phase 0 (Foundation) completion

### 2026-02-21: Phase 0 Gate Review — Initial

- **Result**: CONDITIONAL PASS
- **Violations**: 3 items — regex JSON parsing in gemini.ts (DO NOT DO #8), temperature 0.7 in gemini.ts analysis and chat (DO NOT DO #10), tsconfig `paths` alias for shared types not configured (Phase 0 Task #2 incomplete)
- **Key findings**: Core infrastructure is solid. unpdf correctly replaces pdf-parse, SSE writer is well-implemented, Claude/OpenAI clients are clean. The violations are all confined to legacy gemini.ts (deprecated path) and a missing tsconfig config.
- **Carried forward to Phase 1**: (1) gemini.ts violations acceptable as deprecated-only file but must not propagate to any v2 code, (2) Railway railway.json uses `tsx` for production — acceptable for now but should switch to `node dist/` before Phase 6 deploy.

### 2026-02-21: Phase 0 Gate Review — Re-verification (PASS)

- **Result**: PASS
- **Blockers resolved**:
  - tsconfig.json `paths` alias added: `"@shared/*": ["../shared/*"]` with `"baseUrl": "."`
  - parsePDFWithPages test added to parser.test.ts (inline minimal PDF fixture)
  - rootDir conflict fixed (removed `"../shared/**/*"` from include — paths alias resolves independently)
- **Verification results**: `tsc --noEmit` zero errors, `vitest run` 6/6 pass, server starts on port 3001
- **Features**: All 12 Phase 0 features (v2-001 through v2-012) marked passes: true
- **Remaining accepted items**: gemini.ts legacy violations (DO NOT DO #8, #10) — confined to deprecated v1 path, must not propagate to v2
- **Recommendation**: Phase 0 COMPLETE. Clear to proceed to Phase 1 (Core Engine).

### 2026-02-21: Phase 1 Gate Review (PASS)

- **Result**: PASS
- **DO NOT DO compliance**: All 10 rules pass in new Phase 1 files. Legacy gemini.ts violations (#8, #10) remain but are outside Phase 1 boundary.
- **Architectural compliance**: All 4 decisions verified — multi-provider routing, 3-tier quote verification, SSE progress, prompt caching
- **Temperature discipline**: classify 0.0, analyze 0.2, verify 0.0, synthesize 0.1 — all within ≤0.3
- **Verification**: tsc --noEmit zero errors, vitest 15/15 pass
- **Features**: v2-101 through v2-108 marked passes: true
- **Advisory items**:
  - Verify model IDs (claude-opus-4-6-20250116, claude-sonnet-4-6-20250116) against live API before production
  - Add integration tests for retry path and LLM verdict logic in Phase 2
  - gemini.ts regex JSON parsing must not propagate to v2 code
- **Recommendation**: Phase 1 COMPLETE. Clear to proceed to Phase 2 (Document Intelligence).

---

## Learnings

### Pattern: gemini.ts is legacy but still active

- gemini.ts serves all v1 routes and contains DO NOT DO violations (regex parsing, temperature 0.7)
- These violations are acceptable in the deprecated path but must NEVER appear in any v2 pipeline code
- When Phase 1 pipeline code is written, the reviewer should immediately check that no gemini.ts patterns were copied over

### Pattern: tsconfig path alias + rootDir — fully resolved

- `@shared/*` maps to `../shared/*` via tsconfig `paths` with `baseUrl: "."`
- When files actually IMPORT from `@shared/types`, TypeScript follows the import graph and pulls in `shared/types.ts`, which is outside `rootDir: "./src"` → TS6059 error
- **Fix**: Remove `rootDir` from tsconfig entirely. TypeScript infers rootDir from the import graph. We run with `tsx` (not compiled `tsc` output), so `rootDir` only mattered for output structure — not needed now
- For Phase 6 production build: create a separate `tsconfig.build.json` with rootDir if needed for dist/ output structure

### Pattern: Railway production deploy uses tsx, not compiled JS

- railway.json `startCommand` is `tsx src/index.ts` (interpreted TypeScript)
- package.json has `start:prod: node dist/index.js` which is the right prod approach
- Acceptable for Phase 0/1 development but flag for Phase 6 deploy task
