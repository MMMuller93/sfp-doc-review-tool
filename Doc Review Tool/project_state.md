# Doc Review Tool v2 — Stress-Tested Rebuild Plan

> **Status**: Plan approved, ready for implementation
> **Last Updated**: 2026-02-20
> **Process Mode**: Full Process (multi-session, multi-phase)
> **Plan Version**: 2.0 (post stress-test)

---

## Vision

An easy, automated way to get elite-level legal review of ANY fund documents a GP or LP might encounter. Not just PPMs and sub docs — side letters, fund notices, amendments, consents, capital calls, advisory committee materials, and more. The tool should feel like having a senior fund formation partner review your documents.

**Two tiers of review:**
- **Deep Review**: Specialized analysis for core docs (LPA, PPM, sub docs, side letters) with mandatory checklists
- **Intelligent Review**: Adaptive analysis for any other fund-adjacent document

---

## DO NOT DO

- Do NOT use Vercel — backend deploys to Railway, frontend to GitHub Pages
- Do NOT deviate from SFP design system (stone/bronze colors, Inter/Newsreader fonts)
- Do NOT expose API keys in frontend code
- Do NOT store documents — process in memory only
- Do NOT fabricate document quotes — always cite verbatim text or say "Not found"
- Do NOT use npm workspaces — too much friction with Vite + Railway for minimal benefit
- Do NOT use pdf-parse — unmaintained since 2018, no page boundaries. Use `unpdf` instead.
- Do NOT use regex JSON parsing — use structured output (constrained decoding) on all LLM calls
- Do NOT promise <60s pipeline — realistic target is 45-90 seconds
- Do NOT set temperature above 0.3 for any legal analysis task

---

## Architectural Decisions (Stress-Tested)

### Decision 1: Evolve, don't rebuild
- **What**: Keep existing frontend components, types, design system, Word export. Replace AI engine surgically.
- **Why**: Frontend is solid. The problem is entirely in `services/gemini.js` and single-pass analysis.
- **What changes**: `services/gemini.js` → multi-provider pipeline. `services/parser.js` → enhanced with `unpdf`.
- **What stays**: All UI components, type system, Tailwind config, upload flow, Word export.

### Decision 2: Keep Express backend
- **Why**: File upload (multer, PDF parsing) requires server-side. Multi-pass pipeline needs orchestration. API keys must stay server-side.
- **Change**: Convert backend from JavaScript to TypeScript. Share types via tsconfig path alias (NOT npm workspaces).

### Decision 3: Multi-provider AI (GPT-5.2 + Claude)
- **Architecture**: GPT-5.2 generates analysis → Sonnet 4.6 reviews/verifies → cheap model routes
- **Why**: GPT-5.2 ($1.75/$14) is strong on reasoning but hallucinates 21.9%. Sonnet 4.6 ($3/$15) has 4.7% hallucination — perfect as a reviewer. Detecting errors is easier than generating correct analysis. This is how law firms work: associate drafts, partner reviews.
- **Fallback**: For highest-stakes docs, optionally upgrade analysis to Opus 4.6 ($5/$25, 90.2% BigLaw Bench).

### Decision 4: Replace pdf-parse with unpdf
- **Why**: pdf-parse is dead (2018), concatenates pages with `\n\n`, no page boundary detection.
- **Verified**: POC confirmed `unpdf`'s `extractText(data, { mergePages: false })` returns `string[]` per page.

### Decision 5: 3-tier quote verification
- **Why**: Binary pass/fail doesn't work. POC proved: VERIFIED (>0.75) / REVIEW (0.50-0.75) / REJECT (<0.50). N-gram precision (0.862 real vs 0.173 hallucinated) is the decisive signal. No hallucinated quote ever auto-accepted.

### Decision 6: SSE for progress streaming
- **Verified**: Railway supports SSE, 15-min max duration, no proxy buffering.
- **Requirements**: Send heartbeat every 30s (60s idle timeout), call `res.flushHeaders()` immediately.

### Decision 7: Prompt caching from day 1
- **Why**: Cache reads are 90% cheaper than base input. Module prompts (2-5K tokens) are identical across requests. Real savings: 60-90% on input tokens.
- **Minimum**: 1,024 tokens for Sonnet (met by all module prompts), 4,096 for Opus/Haiku.

---

## Model Strategy

### Per-Stage Assignment

| Pipeline Stage | Model | Cost/call est. | Why |
|---|---|---|---|
| Stage 1: Classify | Haiku 4.5 ($1/$5) | ~$0.003 | Trivial classification. Fastest, cheapest. |
| Stage 2: Extract Structure | Sonnet 4.6 ($3/$15) | ~$0.05-0.15 | Good reasoning for sections/terms. |
| Stage 3: Analyze | GPT-5.2 ($1.75/$14) | ~$0.15-0.45 | Strong reasoning, cost-effective for generation. |
| Stage 3 (premium): Analyze | Opus 4.6 ($5/$25) | ~$0.25-0.80 | Optional upgrade for complex LPAs/PPMs. |
| Stage 4: Review + Verify | Sonnet 4.6 ($3/$15) | ~$0.05-0.15 | Catches hallucinations, validates quotes. |
| Stage 5: Synthesize | Sonnet 4.6 ($3/$15) | ~$0.05-0.10 | Aggregation and verdict. |
| Chat | Sonnet 4.6 ($3/$15) | ~$0.02-0.08 | Conversational follow-up. |
| Cross-doc consistency | Sonnet 4.6 ($3/$15) | ~$0.05-0.15 | Per document pair. |

### Temperature Settings
- Classification: 0.0 (deterministic)
- Structure extraction: 0.0 (deterministic)
- Legal analysis: 0.2 (minimal creativity, maximum precision)
- Review/verification: 0.0 (deterministic)
- Synthesis: 0.1
- Chat: 0.3 (slightly conversational)

### Cost Estimates (Revised, Stress-Tested)

| Scenario | Estimated Cost | Estimated Time |
|---|---|---|
| Side letter (standard) | $0.30-0.60 | 45-70 seconds |
| LPA (standard, GPT-5.2 analyze) | $0.40-0.90 | 50-90 seconds |
| LPA (premium, Opus analyze) | $0.60-1.50 | 60-120 seconds |
| PPM (standard) | $0.40-0.90 | 50-90 seconds |
| Sub doc (standard) | $0.25-0.50 | 40-60 seconds |
| General review | $0.25-0.50 | 40-60 seconds |
| Full fund suite (4 docs + cross-doc) | $2.00-5.00 | 2-3 minutes |
| With prompt caching active | 30-60% total reduction | Same |

### Account Requirements
- Anthropic: Tier 2+ ($40 cumulative spend) for parallel Sonnet calls
- OpenAI: Standard tier for GPT-5.2 access

---

## Pipeline Architecture

```
User uploads document(s)
        ↓
[Parse] → unpdf (per-page text[]), mammoth (DOCX), raw (TXT)
        ↓
[Stage 1: CLASSIFY] → Haiku 4.5 (temp 0.0)
  Input:  First 5000 chars
  Output: { documentType, role, directionality, complexity }
        ↓                              ↓ (parallel)
[Stage 2: EXTRACT STRUCTURE] → Sonnet 4.6 (temp 0.0)
  Input:  Full document text + page boundaries
  Output: { sections[], definedTerms[], crossReferences[], parties[], dates[], economics[] }
        ↓
[Stage 3: ANALYZE] → GPT-5.2 (temp 0.2) or Opus 4.6 (premium)
  Input:  Full text + DocumentStructure + doc-type-specific prompt
  Output: RawIssue[] with evidence citations
  Note:   Module-specific checklist drives completeness
        ↓
[Stage 4: REVIEW + VERIFY] → Sonnet 4.6 (temp 0.0)
  Input:  RawIssue[] + original document text
  Tasks:  (a) Validate quotes (algorithmic 3-tier: VERIFIED/REVIEW/REJECT)
          (b) Check for hallucinated issues (LLM review)
          (c) Verify section references against DocumentStructure
          (d) Flag reasoning gaps
  Output: VerifiedIssue[] with verification status
  Rule:   If >2 issues flagged as hallucinated → retry Stage 3 once
        ↓
[Stage 5: SYNTHESIZE] → Sonnet 4.6 (temp 0.1)
  Input:  VerifiedIssue[] + DocumentStructure + role context
  Output: Final AnalysisResult (verdict, prioritized issues, flags, actions)
        ↓
[Results] → Frontend renders dashboard, enables chat, enables export
```

**Parallelization**: Stages 1 and 2 run concurrently (independent). Stage 4 quote verification uses algorithmic matching first, LLM only for REVIEW-tier cases.

---

## Phase 0: Foundation

**What**: Project infrastructure. No features change.

### Tasks
1. Convert backend to TypeScript (add tsconfig.json, rename .js → .ts, type annotations)
2. Share types via tsconfig path alias (simple `"paths"` in tsconfig, NOT npm workspaces)
3. Add Anthropic SDK (`@anthropic-ai/sdk`) and OpenAI SDK (`openai`)
4. Replace `pdf-parse` with `unpdf` in parser
5. Add SSE support (`utils/sse.ts` helper, `/api/v2/analyze/stream` endpoint skeleton)
6. Extend type system: `DocumentStructure`, `PipelineStage`, `PipelineProgress`, `ReviewModule`, expanded document types
7. Set up Vitest for backend testing with test fixtures
8. Keep existing Gemini code working during transition (no regression)

### Complexity: M | Dependencies: None

### Done when:
- [ ] Backend compiles and runs in TypeScript
- [ ] Both SDKs installed, clients initialized, test calls succeed
- [ ] `unpdf` extracts per-page text from a PDF
- [ ] SSE endpoint sends test events
- [ ] Existing Gemini analysis still works

---

## Phase 1: Core Engine

**What**: The multi-provider analysis pipeline replacing single-shot Gemini.

### Tasks
1. Build Pipeline Orchestrator (`services/pipeline.ts`) — state machine, error handling, SSE progress, timeouts
2. Build Stage 1: Classify (`pipeline/classify.ts`) — Haiku 4.5, expanded doc type taxonomy
3. Build Stage 3: Analyze (`pipeline/analyze.ts`) — GPT-5.2 primary, Opus 4.6 optional premium
4. Build Stage 4: Review + Verify (`pipeline/verify.ts`) — Sonnet 4.6, algorithmic quote matching + LLM review
5. Build Stage 5: Synthesize (`pipeline/synthesize.ts`) — Sonnet 4.6, verdict logic, issue prioritization
6. Wire to API: `POST /api/v2/analyze` + SSE variant
7. Frontend: `useAnalysisStream` hook, pipeline progress UI, feature flag for v1/v2 toggle
8. Build LLM abstraction layer (`services/llm.ts`) — shared interface for Claude, OpenAI, future providers

### Complexity: XL | Dependencies: Phase 0

### Done when:
- [ ] Pipeline processes a side letter end-to-end
- [ ] Pipeline processes an LPA end-to-end
- [ ] >90% of quotes in output are verifiable (VERIFIED tier)
- [ ] SSE progress fires at each stage
- [ ] Feature flag toggles between v1 and v2
- [ ] Pipeline time <90s for a 20-page document

---

## Phase 2: Document Intelligence

**What**: Structure-aware parsing feeding rich metadata into the analysis pipeline.

### Tasks
1. Build Stage 2: Extract Structure (`pipeline/extract-structure.ts`) — Sonnet 4.6, sections/terms/cross-refs/parties/dates/economics
2. Enhance parser with `unpdf` per-page output, heading detection heuristics, table extraction
3. Build defined term index (extraction, lookup, cross-document inconsistency detection)
4. Feed DocumentStructure into Stage 3 analysis prompts
5. Section-level analysis for long documents (50+ pages) — parallel Sonnet calls per section, merge in Stage 5

### Complexity: L | Dependencies: Phase 0, Phase 1

### Done when:
- [ ] Structure extraction produces valid DocumentStructure for LPA and side letter
- [ ] Defined terms extracted with >85% recall
- [ ] Section references in issues map to extracted sections
- [ ] Section-level analysis works for 50+ page documents
- [ ] Stages 1 and 2 run in parallel

---

## Phase 3: Specialized Review Modules

**What**: Deep, doc-type-specific analysis for core document types.

### Tasks
1. Build module framework (`modules/base.ts`) — ReviewModule interface, registry, fallback routing
2. LPA module (`modules/lpa.ts`) — 13-item mandatory checklist, GP/LP framing, economics extraction
3. PPM module (`modules/ppm.ts`) — 8-item checklist, disclosure adequacy focus
4. Sub-doc module (`modules/sub-doc.ts`) — 9-item checklist, representation analysis
5. Side letter module (`modules/side-letter.ts`) — 8-item checklist, MFN/fee/co-invest focus
6. Wire modules to pipeline — Stage 3 routes to correct module, checklist verification post-analysis, targeted follow-up for missing items

### Complexity: XL | Dependencies: Phase 1, Phase 2

### Done when:
- [ ] Each module analyzes all mandatory checklist items
- [ ] Missing checklist items trigger targeted follow-up calls
- [ ] Module routing selects correct module by document type
- [ ] Unrecognized types fall through to general review

---

## Phase 4: General Review

**What**: Intelligent review for any fund-adjacent document without a specialized module.

### Tasks
1. General review module (`modules/general.ts`) — two-pass approach: identify provisions → analyze each
2. UI update — "Deep Review" vs "Intelligent Review" distinction
3. Prompt affinity — borrow relevant checklist items from specialized modules for hybrid documents (e.g., LPA amendments)
4. Unknown document handling — graceful degradation with confidence labeling

### Complexity: M | Dependencies: Phase 1, Phase 2, Phase 3

### Done when:
- [ ] General module produces useful analysis for amendments, fund notices, capital calls
- [ ] UI distinguishes Deep vs Intelligent review
- [ ] Prompt affinity pulls relevant checklist items for hybrid documents

---

## Phase 5: Multi-Document Workflows

**What**: Upload a fund suite, get cross-document consistency checking.

### Tasks
1. Multi-upload UI — accept 2-5 documents, auto-classify each
2. Cross-document consistency engine — term consistency, fee consistency, rights conflicts, cross-reference validity
3. Suite-level summary — aggregate all analyses, top issues, unified action items
4. Results dashboard tabs — one per document + Suite Summary
5. Pipeline orchestration — parallel individual analyses, then cross-doc, then suite summary

### Complexity: L | Dependencies: Phases 1-4

### Done when:
- [ ] 2-5 documents uploaded and individually analyzed
- [ ] Cross-doc check identifies real conflicts
- [ ] Suite summary aggregates all analyses
- [ ] Word export works for full suite report
- [ ] Total suite time <3 minutes for 4 documents

---

## Phase 6: Polish & Deploy

**What**: UX refinements, performance, deployment, hardening.

### Tasks
1. Chat enhancement — Claude-powered, deep dive on any issue, drafting capability
2. Export enhancements — executive summary export, negotiation memo format
3. Performance — prompt caching active, document hash caching, background pre-processing
4. Deployment — Railway TypeScript build, GitHub Pages update, remove Gemini dependency
5. Error handling — rate limits, very long documents, non-English detection, image-only PDF warning
6. UI polish — animated pipeline progress, issue navigation, keyboard shortcuts
7. Security — updated rate limits, input validation, prompt injection defense for Claude/GPT

### Complexity: L | Dependencies: All prior phases

### Done when:
- [ ] Chat uses Claude and produces high-quality responses
- [ ] Prompt caching active and measurable
- [ ] Deployed to Railway + GitHub Pages
- [ ] Gemini dependency removed
- [ ] End-to-end test: upload real doc → analysis → chat → export

---

## Implementation Order

**Critical path**: Phase 0 → Phase 1 → Phase 2 → Phase 3

**MVP (minimum shippable)**: Phase 0 + Phase 1 + side letter module from Phase 3 + deployment from Phase 6

```
Phase 0: Foundation              ████
Phase 1: Core Engine             ████████████
Phase 2: Document Intelligence   ████████
Phase 3: Specialized Modules     ████████████
Phase 4: General Review          ████
Phase 5: Multi-Document          ████████
Phase 6: Polish & Deploy         ████████
```

---

## File Structure After Rebuild

```
Doc Review Tool/
├── shared/
│   └── types.ts                    # Shared types (tsconfig path alias)
├── frontend/
│   ├── src/
│   │   ├── hooks/
│   │   │   └── useAnalysisStream.ts  # NEW: SSE stream hook
│   │   ├── components/
│   │   │   ├── PipelineProgress.tsx   # NEW: pipeline visualization
│   │   │   ├── DocumentUpload.tsx     # Enhanced: multi-upload
│   │   │   ├── ResultsDashboard.tsx   # Enhanced: multi-doc tabs
│   │   │   └── ...existing
│   │   └── utils/
│   │       └── wordExport.ts          # Enhanced: suite report
│   └── ...
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── upload.ts
│   │   │   ├── analyze.ts            # v2 with pipeline
│   │   │   ├── chat.ts               # Claude-powered
│   │   │   └── consistency.ts        # NEW: cross-doc
│   │   ├── services/
│   │   │   ├── llm.ts               # NEW: multi-provider abstraction
│   │   │   ├── claude.ts            # NEW: Anthropic client
│   │   │   ├── openai.ts            # NEW: OpenAI client
│   │   │   ├── pipeline.ts          # NEW: orchestrator
│   │   │   ├── parser.ts            # Enhanced: unpdf
│   │   │   └── gemini.js            # DEPRECATED: fallback only
│   │   ├── pipeline/
│   │   │   ├── classify.ts          # Stage 1: Haiku
│   │   │   ├── extract-structure.ts  # Stage 2: Sonnet
│   │   │   ├── analyze.ts           # Stage 3: GPT-5.2 / Opus
│   │   │   ├── verify.ts            # Stage 4: Sonnet + algorithmic
│   │   │   └── synthesize.ts        # Stage 5: Sonnet
│   │   ├── modules/
│   │   │   ├── base.ts              # ReviewModule interface
│   │   │   ├── registry.ts          # Module routing
│   │   │   ├── lpa.ts
│   │   │   ├── ppm.ts
│   │   │   ├── sub-doc.ts
│   │   │   ├── side-letter.ts
│   │   │   └── general.ts
│   │   └── utils/
│   │       ├── sse.ts               # SSE helper
│   │       └── fuzzy-match.ts       # Quote verification (3-tier)
│   └── test/
│       ├── fixtures/
│       └── pipeline.test.ts
└── ...
```

---

## Stress-Test Log (2026-02-20)

### Claims Verified
- Anthropic structured output: GA, constrained decoding, Zod helper. Schema fits (3 optional params, 8 unions).
- Prompt caching: GA, 90% savings on reads, 1024-token min for Sonnet.
- SSE on Railway: Works, 15-min max, no buffering. Need 30s heartbeat.
- unpdf replacement: POC confirmed per-page string[] extraction.
- Fuzzy quote matching: POC confirmed 3-tier system, 100% hallucination rejection.

### Claims Corrected
- Pipeline <60s → revised to 45-90s with parallel stages and Sonnet default
- Cost $1.50-3.00/LPA → revised to $0.40-0.90 (standard), $0.60-1.50 (premium)
- npm workspaces → dropped, use tsconfig path alias
- pdf-parse page boundaries → false, replaced with unpdf
- Prompt caching 30-50% → actually 60-90% on input tokens

### Model Landscape (Feb 2026)
- Claude Opus 4.6: $5/$25, 200K/1M beta, 4.7% hallucination, 90.2% BigLaw Bench
- Claude Sonnet 4.6: $3/$15, 200K/1M beta, freshest training data (Jan 2026)
- Claude Haiku 4.5: $1/$5, 200K, fast classification
- GPT-5.2: $1.75/$14, 400K, 21.9% hallucination, strong reasoning
- Gemini 3.1 Pro: $2/$12, 1M native, 12.5% hallucination
- Llama 4 Maverick: ~$0.17/$0.60, 1M, open weights, unverified legal quality

---

## Existing Assets Preserved
- TypeScript type system (types.ts) — well-designed, fits Claude's structured output limits
- SFP design system and branding (Tailwind config)
- All frontend components (enhanced incrementally)
- Word export functionality
- Role-based analysis concept (GP vs LP perspective)
- Express server structure
- Railway deployment config
- GitHub Pages deployment workflow
