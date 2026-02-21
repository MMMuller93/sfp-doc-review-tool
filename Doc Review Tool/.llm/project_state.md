# Doc Review Tool - Project State

**Last Updated:** 2026-01-09
**Status:** Backend working, frontend needs deployment

---

## Project Overview

**What it is:** AI-powered legal document review tool for private fund professionals. Analyzes LPAs, side letters, subscription docs, and co-investment agreements.

**Target Users:**
- Fund counsel
- Small/medium VC teams and SPV managers
- Emerging managers
- Small/medium LPs

**NOT for:** Enterprise/institutional features, $5B fund benchmarks, ILPA committee-level governance

**Core Features:**
1. Document upload and AI analysis
2. Issue flagging with severity levels (blocker/negotiate/standard)
3. Verdict system (safe-to-sign, negotiate, high-risk, do-not-sign)
4. Suggested fixes with redline language
5. Chat interface for Q&A about analyzed documents
6. Export to Word/JSON

**Hosted:**
- Frontend: GitHub Pages (https://mmmuller93.github.io/sfp-doc-review-tool/)
- Backend: Railway (https://railway-up-production-7cf4.up.railway.app)

---

## Technical Architecture

### Frontend
- **Stack:** Vite + React + TypeScript
- **Styling:** Tailwind CSS with custom bronze/stone color palette
- **Deployment:** GitHub Pages via `npm run deploy`
- **Key Files:**
  - `frontend/src/App.tsx` - Main app with session state management
  - `frontend/src/components/DocumentUpload.tsx` - File upload and API calls
  - `frontend/src/components/ResultsDashboard.tsx` - Analysis results display
  - `frontend/src/components/ChatInterface.tsx` - Conversational Q&A
  - `frontend/src/types.ts` - TypeScript interfaces (CRITICAL: API must match these)

### Backend
- **Stack:** Node.js + Express
- **AI:** Google Gemini API (`gemini-3-flash-preview` model)
- **Deployment:** Railway (manual deploy via `railway up`)
- **Key Files:**
  - `backend/src/index.js` - Express server setup
  - `backend/src/services/gemini.js` - Gemini API integration
  - `backend/src/routes/upload.js` - Document upload and analysis endpoint
  - `backend/src/routes/chat.js` - Chat endpoint for Q&A

### API Endpoints
- `POST /api/upload/analyze` - Upload document, get analysis
- `POST /api/chat` - Conversational Q&A about documents
- `GET /health` - Health check

---

## Current State (2026-01-09)

### What's Working
- [x] Backend deployed to Railway with new API key
- [x] Gemini 3 Flash Preview model configured
- [x] API returns correct schema matching frontend types
- [x] Defensive defaults added to frontend switch statements
- [x] Chat endpoint exists and works

### What Needs Attention
- [ ] Frontend needs rebuild and deploy to GitHub Pages
- [ ] Chat interface untested on live site
- [ ] Quick action buttons for issues (planned feature)

### Recent Fixes Applied
1. **API Key Leak:** Old key was exposed, replaced with new key
2. **Model 404:** Changed from non-existent `gemini-3-flash` to `gemini-3-flash-preview`
3. **Model Overload:** Changed from `gemini-2.5-flash` (503 errors) to `gemini-3-flash-preview`
4. **Schema Mismatch:** API was returning wrong field names, updated prompt with explicit schema
5. **Frontend Crashes:** Added default cases to all switch statements in ResultsDashboard.tsx

---

## Critical Schema Information

The frontend expects this exact Issue structure (see `frontend/src/types.ts`):

```typescript
interface Issue {
  id: string;                 // "issue-001"
  risk: 'blocker' | 'negotiate' | 'standard';
  topic: IssueTopic;          // enum of valid topics
  title: string;              // Short headline
  summary: string;            // 1-2 sentences
  impactAnalysis: string;     // Why this matters
  targetRef: {
    document: 'target' | 'reference';
    locator: string;          // "Section X.X"
    quote: string;            // Verbatim text
  };
  referenceRef?: ClauseReference;
  fixes: SuggestedFix[];      // At least one required
  marketContext?: string;
}
```

The backend prompt in `gemini.js` MUST specify this exact structure or the frontend crashes.

---

## Environment Variables

### Railway (Backend)
```
GEMINI_API_KEY=AIzaSyARt2OESByuvJBOsMlkI4qacuDBjzBF14Q
CORS_ORIGIN=*
FRONTEND_URL_PROD=https://mmmuller93.github.io
NODE_ENV=production
PORT=3001
```

### Local Development
Backend `.env` file should mirror Railway variables.

---

## Deployment Commands

### Backend (Railway)
```bash
cd "/Users/Miles/Desktop/Doc Review Tool/backend"
railway up --service "railway up"
```

### Frontend (GitHub Pages)
```bash
cd "/Users/Miles/Desktop/Doc Review Tool/frontend"
npm run build && npm run deploy
```

### Check Railway Logs
```bash
cd "/Users/Miles/Desktop/Doc Review Tool/backend"
railway logs --service "railway up" -n 50
```

### Update Railway Variables
```bash
railway variables --set "KEY=VALUE" --service "railway up"
```

---

## DO NOT DO

Learned corrections from this session:

1. **Don't assume model names exist** - Always verify with ListModels API or documentation
2. **Don't deploy without testing** - Curl the API before declaring "done"
3. **Don't hide errors with optional chaining** - Fix the root cause, not the symptoms
4. **Don't use em dashes (—)** - Use colons, semicolons, or commas instead
5. **Don't over-engineer for enterprise** - This is for small/medium teams, not $5B funds
6. **Don't add features without verifying base functionality works first**
7. **Don't assume Railway auto-deploys** - Must manually run `railway up`
8. **Don't expose API keys in logs or variable outputs**

---

## Git Repository

- **URL:** https://github.com/MMMuller93/sfp-doc-review-tool
- **Branch:** main
- **Structure:** Monorepo with `/frontend` and `/backend` directories

---

## Next Steps (Priority Order)

1. **Deploy frontend to GitHub Pages**
   - Run `npm run build && npm run deploy` in frontend directory
   - Or wait for GitHub Actions if configured

2. **Test live site end-to-end**
   - Upload a real fund document
   - Verify analysis displays correctly
   - Test chat interface appears and works

3. **Add quick action buttons to issues**
   - Buttons like "Draft response", "Explain more", "Show in document"
   - Connect to chat interface

4. **Consider adding:**
   - Document comparison mode (consistency checking)
   - Session persistence improvements
   - Error handling UI improvements

---

## Useful Test Commands

### Test API health
```bash
curl https://railway-up-production-7cf4.up.railway.app/health
```

### Test analysis endpoint
```bash
echo "Sample LPA text" > /tmp/test.txt
curl -X POST "https://railway-up-production-7cf4.up.railway.app/api/upload/analyze" \
  -F "targetDocument=@/tmp/test.txt;filename=test.txt;type=text/plain"
```

### Test chat endpoint
```bash
curl -X POST "https://railway-up-production-7cf4.up.railway.app/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","message":"hello","analysisContext":{},"documentTexts":{}}'
```

---

## Session History Summary

This session focused on:
1. Understanding the project structure and goals
2. Diagnosing why "Analysis failed" errors were occurring
3. Fixing API key issues (leaked key)
4. Fixing model name issues (gemini-3-flash -> gemini-3-flash-preview)
5. Fixing schema mismatch between API response and frontend types
6. Adding defensive defaults to prevent frontend crashes
7. Deploying fixes to Railway

The tool is now functional at the API level. Frontend deployment pending.
