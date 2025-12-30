# Doc Review Tool - Project State

> **Status**: Initializer phase COMPLETE - Ready for feature implementation
> **Last Updated**: 2025-12-30
> **Process Mode**: Full Process (multi-session expected)
> **Current Phase**: Transitioning from Initializer to Coding Agent

---

## Prime Directives

This project follows:
- **~/.claude/CLAUDE.md** - Core engineering principles (investigate, understand, clarify, match patterns, minimum viable)
- **CLAUDE_BEST_PRACTICES.md** - Two-agent pattern for long-running work

**Key Principles to Maintain**:
- ✓ Work on ONE feature at a time
- ✓ Never remove/edit features in features.json, only update `passes` field
- ✓ Test end-to-end before marking features complete
- ✓ Commit after each feature with clear message
- ✓ Update this file before ending each session

---

## DO NOT DO

_(User corrections and anti-patterns captured here as they emerge)_

- Do NOT use Vercel - backend deploys to Railway, frontend to GitHub Pages
- Do NOT deviate from SFP design system (stone/bronze colors, Inter/Newsreader fonts)
- Do NOT expose API keys in frontend code
- Do NOT store documents - process in memory only
- Do NOT fabricate document quotes - always cite verbatim text or say "Not found"

---

## Current State

**Environment**: ✅ Fully initialized and ready
- ✅ Git repository initialized (commit: fdc916c)
- ✅ Frontend: Vite + React + TypeScript configured
- ✅ Backend: Express server structure created
- ✅ Dependencies: package.json files created (not yet installed)
- ✅ Tailwind CSS configured with SFP design tokens
- ✅ Complete TypeScript types matching specification
- ✅ 30 features defined in features.json

**What Works**:
- Project structure is complete
- Configuration files are ready
- init.sh script will install dependencies and verify environment
- Git repository tracking all files

**What's Broken/In Progress**:
- Dependencies not yet installed (run init.sh or npm install in each folder)
- Backend .env file needs to be created from .env.example
- No features implemented yet (all passes: false)

---

## Project Overview

**Purpose**: AI-powered legal document review tool for private fund professionals. Users upload fund documents (side letters, LPAs, subscription docs), select their role (GP or LP), and receive structured analysis with risk ratings, negotiation points, and exportable redlines.

**Target Users**: Private equity, venture capital, and hedge fund professionals (GPs and LPs)

**Lead Generation**: This tool lives on strategicfundpartners.com as a lead gen asset

**Tech Stack**:
- **Frontend**: Vite + React + TypeScript, Tailwind CSS, Framer Motion, deployed to GitHub Pages
- **Backend**: Node.js + Express, Railway serverless functions
- **LLM**: Google Gemini 2.5 Pro with structured output
- **Document Parsing**: pdf-parse (PDF), mammoth (DOCX)
- **Export**: docx library for Word export

**Key Requirements**:
1. No user accounts - one-shot analysis, no persistence
2. Secure API key handling - backend only
3. Prompt injection defense in system prompt
4. Evidence-based output - all issues cite verbatim document text
5. Structured JSON output (not markdown parsing)
6. Match SFP website design system
7. Mobile-friendly
8. Analysis completes in <45 seconds

---

## Architectural Decisions

### Decision 1: Match SFP-2 Stack
- **Context**: User has existing SFP website (SFP-2 project) using Vite + React + TypeScript deployed to GitHub Pages
- **Decision**: Use same frontend stack (Vite + React + TS) for consistency
- **Rationale**: Maintains consistency with existing SFP properties, team familiarity, proven deployment workflow
- **Alternatives Considered**: Next.js (easier backend integration but different from existing stack)

### Decision 2: Railway for Backend
- **Context**: Need secure backend for Gemini API calls, can't expose keys in browser
- **Decision**: Use Railway serverless functions with Express
- **Rationale**: User has experience with Railway, simple deployment, scales well, cost-effective
- **Alternatives Considered**: Vercel (rejected - not their stack), Supabase Edge Functions (considered but Railway preferred), AWS Lambda (too complex)

### Decision 3: Google Gemini 2.5 Pro
- **Context**: Need LLM with strong legal reasoning, long context, structured output
- **Decision**: Gemini 2.5 Pro with 1M token context window
- **Rationale**: Spec example uses it, handles long documents (50 pages), structured JSON mode, good cost (~$3.50/analysis)
- **Alternatives Considered**: Claude 3.7 Sonnet (excellent but more expensive), GPT-4o (shorter context, may need chunking)

### Decision 4: GitHub Pages Deployment
- **Context**: Frontend deployment strategy
- **Decision**: GitHub Pages with GitHub Actions workflow (matching SFP-2)
- **Rationale**: Proven workflow from SFP-2, free, reliable, simple CI/CD
- **Alternatives Considered**: None - this matches existing pattern

### Decision 5: Tailwind with Custom SFP Tokens
- **Context**: Styling framework choice
- **Decision**: Tailwind CSS with extended theme for SFP colors/fonts
- **Rationale**: Modern, matches SFP-2 approach, easy to maintain design system consistency
- **Design Tokens**:
  - Colors: stone-950, stone-925, bronze-500, bronze-400, bronze-200, bronze-50
  - Fonts: Inter (sans), Newsreader (serif)
  - Grid: 60px background pattern with bronze accent

---

## Next Steps

**Immediate Priority** (Coding Agent Phase):
1. **Install Dependencies**
   - Run init.sh OR manually npm install in frontend/ and backend/
2. **Create backend/.env**
   - Copy .env.example and add GEMINI_API_KEY
3. **Implement Infrastructure Features** (Priority 1):
   - feat-001: Verify Vite project builds and runs
   - feat-002: Verify TypeScript types are complete
   - feat-003: Verify Tailwind configuration works
   - feat-004: Set up Gemini integration in backend
4. **First Functional Feature**:
   - feat-008: Document parsing (PDF, DOCX, TXT)

**Session Workflow Reminder**:
- Start each session: `pwd`, read claude-progress.txt, read features.json, `git log --oneline -20`, run init.sh
- Work on ONE feature at a time
- Test before marking passes: true
- Commit after each feature
- Update claude-progress.txt and this file before ending session

---

## Feature Tracking Summary

**Total Features**: 30
- **Infrastructure**: 7 features (feat-001 to feat-004, feat-026 to feat-027)
- **UI**: 10 features (feat-005 to feat-007, feat-016 to feat-021)
- **Functional**: 6 features (feat-008 to feat-010, feat-022 to feat-024)
- **Security**: 3 features (feat-011 to feat-013)
- **Quality**: 2 features (feat-014 to feat-015)
- **Integration**: 1 feature (feat-025)
- **Testing**: 3 features (feat-028 to feat-030)

**Completed**: 0/30
**In Progress**: None yet
**Next**: feat-001 (Vite + React + TS project verification)

---

## Session Log

### Session 1 - 2025-12-30 (Initializer Phase)
**Completed:**
- ✅ Reviewed complete build specification (Untitled-1)
- ✅ Inspected strategicfundpartners.com for design system
- ✅ Analyzed SFP-2 project (~/.Desktop/SFP-2) for tech stack reference
- ✅ Decided architecture: Vite + React + TS frontend, Railway backend, Gemini 2.5 Pro
- ✅ Created features.json with 30 comprehensive features
- ✅ Initialized frontend project (Vite + React + TS)
- ✅ Configured Tailwind CSS with SFP design tokens
- ✅ Created complete TypeScript types (frontend/src/types.ts)
- ✅ Created backend Express server structure
- ✅ Created init.sh environment setup script
- ✅ Created README.md with full documentation
- ✅ Created claude-progress.txt for session tracking
- ✅ Initialized git repository and made first commit (fdc916c)
- ✅ Updated project_state.md

**Status**: Initializer phase COMPLETE. Project structure ready for feature implementation.

**Next Session**: Begin Coding Agent phase - install dependencies, verify build, start implementing priority 1 infrastructure features.

---

## Technical Reference

### SFP Design System (from strategicfundpartners.com)
- Background: #0a0908 (stone-950), #100f0e (stone-925)
- Accent: #bf9f75 (bronze-500), #ccb391 (bronze-400)
- Text: #e6d9c9 (bronze-200), #f2ece4 (bronze-50)
- Grid: 60px × 60px with 5% bronze accent lines
- Fonts: Inter (sans), Newsreader (serif)
- Scrollbar: 6px custom themed

### Project Commands
```bash
# Environment setup
./init.sh

# Development
cd frontend && npm run dev  # http://localhost:5173
cd backend && npm run dev   # http://localhost:3001

# Build
cd frontend && npm run build  # output: dist/

# Git workflow
git status
git add .
git commit -m "feat: description"
git log --oneline -20
```

### Backend Environment Variables
```
GEMINI_API_KEY=<your key>
PORT=3001
NODE_ENV=development
FRONTEND_URL_LOCAL=http://localhost:5173
FRONTEND_URL_PROD=https://your-github-pages-url.com
```

---

## Notes

- **Specification document**: Untitled-1 (opened in IDE) - contains complete system prompts, schemas, success criteria
- **Reference project**: ~/Desktop/SFP-2 - existing SFP website, matches our tech stack
- **Deployment**: Frontend and backend are separate deployments (GitHub Pages + Railway)
- **No user accounts**: Everything is stateless, one-shot analysis
- **Security critical**: API key security, prompt injection defense, no document storage
