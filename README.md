# Private Fund Document Review Tool

AI-powered legal analysis tool for private fund professionals. Upload side letters, LPAs, and subscription documents to get structured risk analysis, negotiation points, and exportable redlines.

## Tech Stack

**Frontend:**
- Vite + React + TypeScript
- Tailwind CSS (SFP design system)
- Framer Motion for animations
- Deployed to GitHub Pages

**Backend:**
- Node.js + Express
- Google Gemini 2.5 Pro API
- Deployed to Railway

## Project Structure

```
/
├── frontend/          # Vite + React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── types.ts     # TypeScript type definitions
│   │   └── ...
│   └── package.json
│
├── backend/           # Express backend API
│   ├── src/
│   │   ├── index.js     # Main server
│   │   ├── routes/      # API route handlers
│   │   └── services/    # Business logic (Gemini integration, parsing)
│   └── package.json
│
├── features.json           # Feature tracking (NEVER remove features, only update passes field)
├── claude-progress.txt     # Session log
├── project_state.md        # Project state and decisions
└── init.sh                 # Environment setup script
```

## Setup

### 1. Initial Setup

```bash
# Run the initialization script
./init.sh
```

Or manually:

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Configure Environment

```bash
# Copy backend environment template
cp backend/.env.example backend/.env

# Edit backend/.env and add your Gemini API key
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Development

```bash
# Start backend (from backend/)
npm run dev
# Runs on http://localhost:3001

# Start frontend (from frontend/)
npm run dev
# Runs on http://localhost:5173
```

### 4. Build for Production

```bash
# Frontend
cd frontend
npm run build
# Output: frontend/dist/

# Backend runs directly on Railway (no build step)
```

## Deployment

### Frontend (GitHub Pages)

The frontend is deployed automatically via GitHub Actions when pushing to `main`.

1. Push to main branch
2. GitHub Actions builds the frontend
3. Deploys to GitHub Pages

### Backend (Railway)

1. Create a Railway project
2. Connect to this repository
3. Set root directory to `backend/`
4. Add environment variables:
   - `GEMINI_API_KEY`
   - `FRONTEND_URL_PROD` (your GitHub Pages URL)
5. Deploy

## Features & Progress

See [features.json](features.json) for complete feature list and tracking.

**Critical Rules:**
- ✅ Work on ONE feature at a time
- ✅ NEVER remove or edit features in features.json - only update `passes` field
- ✅ Test end-to-end before marking features complete
- ✅ Commit after each feature completion

## Session Workflow

### Starting a Session

1. `pwd` - Verify working directory
2. `cat claude-progress.txt` - Read recent progress
3. `cat features.json` - Check feature status
4. `git log --oneline -20` - Review recent commits
5. `./init.sh` - Start environment
6. Select next highest-priority incomplete feature

### Ending a Session

1. Verify code compiles and runs
2. Commit all changes: `git add . && git commit -m "descriptive message"`
3. Update `claude-progress.txt` with session summary
4. Update `features.json` with feature status changes
5. Update `project_state.md` if needed
6. Ensure environment is in clean state

## Development Guidelines

### TypeScript Types

All types are defined in `frontend/src/types.ts` and match the complete specification schema. These types are used for:
- Frontend component props
- API request/response validation
- Gemini structured output schema

### Security Rules

1. **No API keys in frontend** - All LLM calls through backend
2. **No document storage** - Process in memory, discard after analysis
3. **Prompt injection defense** - System prompt treats document content as untrusted
4. **Evidence-based output** - Every issue must cite verbatim document text

### Design System (SFP)

Colors:
- Background: `stone-950` (#0a0908)
- Surface: `stone-925` (#100f0e)
- Accent: `bronze-500` (#bf9f75)
- Text: `bronze-200` (#e6d9c9)

Typography:
- Sans: Inter
- Serif: Newsreader

## Testing

### Manual Testing Checklist

- [ ] Upload PDF side letter - analysis completes
- [ ] Upload DOCX document - analysis completes
- [ ] All issues include valid document quotes
- [ ] GP analysis vs LP analysis produce different outputs
- [ ] Export to Word generates clean document
- [ ] Prompt injection test - AI does not follow embedded instructions
- [ ] Mobile responsive - works on 320px+ screens

## Documentation

- [Complete Build Specification](Untitled-1) - Full product requirements
- [Project State](project_state.md) - Current status and architectural decisions
- [Features](features.json) - Feature tracking
- [Progress Log](claude-progress.txt) - Session history

## Support

For issues or questions, contact Strategic Fund Partners.

---

**Disclaimer:** This tool provides preliminary analysis for informational purposes only and does not constitute legal advice. Always consult qualified legal counsel before executing fund documents.
