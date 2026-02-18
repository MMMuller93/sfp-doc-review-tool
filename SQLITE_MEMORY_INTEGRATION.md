# SQLite Structured Memory for Claude Code Projects

## What This Is

A drop-in structured memory system for Claude Code hooks. Replaces append-only markdown memory with queryable SQLite + FTS5 full-text search, while keeping markdown as a human-readable backup (dual-write).

Cherry-picked from [claude-mem](https://github.com/thedotmack/claude-mem) and adapted for the Elite Cockpit hook architecture.

**Zero external dependencies** — Python stdlib `sqlite3` only.

---

## What It Does

| Feature | Description |
|---------|-------------|
| **Observation storage** | Structured records: type, title, narrative, facts, concepts, files touched, agent |
| **Session tracking** | Groups observations by session with start/end timestamps |
| **FTS5 search** | Full-text search across all observations |
| **Context injection** | Auto-injects recent memory on session start via `systemMessage` |
| **Pre-compact capture** | Saves state to DB before Claude compacts context |
| **File tracking** | Records which files were modified per session |
| **Privacy stripping** | `<private>...</private>` tags removed before storage |
| **Progressive disclosure** | 3-layer context budget: session summaries -> titles -> full details |
| **Backward compatible** | Dual-writes to both SQLite and existing markdown files |
| **Fail-open** | If SQLite fails, hooks still work and markdown still writes |

---

## Files

### Core (copy these)

| File | Location | Purpose |
|------|----------|---------|
| `memory_db.py` | `.claude/hooks/memory_db.py` | SQLite module (~270 lines): schema, CRUD, FTS search, context builder |
| `recall.md` | `.claude/commands/recall.md` | `/recall` slash command for interactive memory search |

### Hook modifications (integrate into existing hooks)

| Hook | Event | What to add |
|------|-------|-------------|
| `session-start.py` | SessionStart | Init DB, create session, inject context via `systemMessage` |
| `pre-compact.py` | PreCompact | Store compaction marker observation + append to project_state.md |
| `update-state.py` | PostToolUse | Track file Write/Edit as `change` observations |
| `user-prompt-submit.py` | UserPromptSubmit | Create session if none exists, store task for medium/full complexity |
| `verify-witness.py` | Stop | End session on clean exit or auto-loop completion |

### lib.py additions (add to bottom of existing lib.py)

Three thin wrapper functions:
- `log_observation()` — Dual-write to SQLite + markdown
- `search_memory()` — FTS search wrapper
- `get_session_context()` — Context injection builder

---

## Integration Steps

### Step 1: Copy core files

```bash
# Copy memory_db.py into your project's hooks directory
cp memory_db.py YOUR_PROJECT/.claude/hooks/memory_db.py

# Copy recall command
cp recall.md YOUR_PROJECT/.claude/commands/recall.md
```

### Step 2: Add wrappers to lib.py

Append this to the bottom of your `.claude/hooks/lib.py`:

```python
# ============================================================================
# SQLite-Enhanced Memory (Dual-Write)
# ============================================================================

MEMORY_DB = os.path.join(PROJECT_ROOT, ".llm", "memory.db")


def log_observation(
    obs_type: str,
    title: str,
    narrative: str = None,
    facts: list = None,
    concepts: list = None,
    files_read: list = None,
    files_mod: list = None,
    agent: str = None,
    also_markdown: bool = True,
) -> None:
    """
    Dual-write: store to SQLite AND optionally append to shared_memory.md.
    Falls back to markdown-only if SQLite unavailable.
    """
    if also_markdown and narrative:
        log_to_shared_memory(title, narrative, narrative[:100], agent or "system")

    try:
        from memory_db import init_db, store_observation, get_current_session_id, strip_private
        init_db(PROJECT_ROOT)
        session_id = get_current_session_id(PROJECT_ROOT) or "untracked"
        clean_narrative = strip_private(narrative) if narrative else None
        store_observation(
            PROJECT_ROOT, session_id, obs_type, title,
            narrative=clean_narrative, facts=facts, concepts=concepts,
            files_read=files_read, files_mod=files_mod, agent=agent,
            source_file=SHARED_MEMORY if also_markdown else None,
        )
    except Exception:
        pass


def search_memory(query: str, limit: int = 10, obs_type: str = None) -> list:
    """Search observations via FTS. Returns list of dicts."""
    try:
        from memory_db import init_db, search_observations
        init_db(PROJECT_ROOT)
        return search_observations(PROJECT_ROOT, query, limit=limit, obs_type=obs_type)
    except Exception:
        return []


def get_session_context(token_budget: int = 2000) -> str:
    """Get context injection string for session start."""
    try:
        from memory_db import init_db, get_context_summary
        init_db(PROJECT_ROOT)
        return get_context_summary(PROJECT_ROOT, token_budget=token_budget)
    except Exception:
        return ""
```

### Step 3: Update hooks

Each hook change is wrapped in `try/except` and fails silently, so you can integrate incrementally.

**session-start.py** — Replace stub with:

```python
#!/usr/bin/env python3
import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import load_state, save_state, PROJECT_ROOT

def main():
    try:
        from memory_db import init_db, create_session, get_context_summary
        init_db(PROJECT_ROOT)
        state = load_state()
        session_id = create_session(PROJECT_ROOT, mode=state.get("mode", "light"))
        state["current_session_id"] = session_id
        save_state(state)
        context = get_context_summary(PROJECT_ROOT, token_budget=2000)
        if context.strip():
            print(json.dumps({
                "decision": "allow",
                "systemMessage": "## Memory Context\n\n" + context
            }))
        else:
            print(json.dumps({"decision": "allow"}))
    except Exception:
        print(json.dumps({"decision": "allow"}))
    sys.exit(0)

if __name__ == "__main__":
    main()
```

**update-state.py** — Add file tracking:

```python
#!/usr/bin/env python3
import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import allow, PROJECT_ROOT, load_state

def main():
    try:
        input_data = sys.stdin.read()
        if input_data:
            hook_input = json.loads(input_data)
            tool_name = hook_input.get("tool_name", "")
            tool_input = hook_input.get("tool_input", {})
            if tool_name in ("Write", "Edit"):
                file_path = tool_input.get("file_path", "")
                if file_path and not file_path.endswith((".pyc", ".pyo")):
                    try:
                        from memory_db import init_db, store_observation, get_current_session_id
                        init_db(PROJECT_ROOT)
                        state = load_state()
                        sid = state.get("current_session_id") or get_current_session_id(PROJECT_ROOT) or "untracked"
                        store_observation(PROJECT_ROOT, sid, "change",
                            title=f"Modified: {os.path.basename(file_path)}",
                            files_mod=[file_path],
                            agent=state.get("current_agent") or "unknown")
                    except Exception:
                        pass
    except Exception:
        pass
    allow()

if __name__ == "__main__":
    main()
```

**user-prompt-submit.py** — Add after `save_state(state)`:

```python
# Store session + observation in structured memory
try:
    from memory_db import init_db, get_current_session_id, create_session, store_observation
    init_db(PROJECT_ROOT)
    session_id = get_current_session_id(PROJECT_ROOT)
    if not session_id:
        session_id = create_session(PROJECT_ROOT, mode=analysis["mode"])
        state["current_session_id"] = session_id
        save_state(state)
    if analysis["mode"] in ("medium", "full"):
        store_observation(
            PROJECT_ROOT, session_id, "change",
            title=f"Task: {prompt[:80]}",
            narrative=prompt[:500],
            concepts=[analysis["mode"]] + analysis.get("triggers", []),
            agent="dispatcher",
        )
except Exception:
    pass
```

**verify-witness.py** — Add helper and calls:

```python
def _end_current_session(summary: str) -> None:
    try:
        from memory_db import init_db, get_current_session_id, end_session
        init_db(PROJECT_ROOT)
        session_id = get_current_session_id(PROJECT_ROOT)
        if session_id:
            end_session(PROJECT_ROOT, session_id, summary=summary)
    except Exception:
        pass
```

Call `_end_current_session("...")` before `allow()` at each exit point.

**pre-compact.py** — Store compaction marker:

```python
try:
    from memory_db import init_db, store_observation, get_current_session_id
    init_db(PROJECT_ROOT)
    sid = state.get("current_session_id") or get_current_session_id(PROJECT_ROOT) or "untracked"
    store_observation(PROJECT_ROOT, sid, "discovery",
        title="Context compaction occurred",
        narrative=f"Mode: {state.get('mode')}, Phase: {state.get('phase')}, Agent: {state.get('current_agent')}",
        concepts=["compaction", "context-loss"], agent="system")
except Exception:
    pass
```

---

## SQLite Schema

Database stored at `.llm/memory.db`.

**Tables:**
- `sessions` — id, started_at, ended_at, mode, summary, obs_count
- `observations` — id, session_id, timestamp, type, title, narrative, facts (JSON), concepts (JSON), files_read (JSON), files_mod (JSON), agent, source_file, token_est
- `observations_fts` — FTS5 virtual table synced via triggers

**Observation types:** `decision`, `bugfix`, `feature`, `refactor`, `discovery`, `change`, `correction`, `pattern`

**Indexes:** session_id, type, timestamp, agent

---

## Usage

### Programmatic (from hooks/agents)
```python
from lib import log_observation, search_memory, get_session_context

# Store
log_observation("pattern", "Keyset pagination", narrative="Use .gt('id', last_id) for large tables")

# Search
results = search_memory("pagination")

# Context injection
context = get_session_context(token_budget=2000)
```

### Interactive (slash command)
```
/recall auth patterns       # FTS search
/recall --type correction   # Filter by type
/recall --session latest    # Latest session observations
```

---

## Design Decisions

- **Lazy imports**: `memory_db` is imported inside each function. If the module is missing, everything degrades gracefully to markdown-only.
- **Dual-write by default**: `log_observation(also_markdown=True)` writes to both SQLite and shared_memory.md.
- **`<private>` stripping**: Content wrapped in `<private>...</private>` tags is replaced with `[REDACTED]` before SQLite storage.
- **Token estimation**: `len(text) // 4` heuristic for budgeting context injection.
- **WAL mode**: SQLite uses Write-Ahead Logging for safe concurrent access.
- **Fail-open everywhere**: Every SQLite operation is wrapped in try/except. Hooks never block due to DB errors.

---

## Origin

Built 2026-01-31 for Elite Cockpit v3.1.1. Cherry-picked from [claude-mem](https://github.com/thedotmack/claude-mem) concepts:
- Structured observation schema (types, facts, concepts, files)
- FTS5 full-text search
- Progressive disclosure (3-layer token-budgeted context)
- Privacy tag stripping
- Session lifecycle tracking

Adapted to work within Python stdlib constraints (no Node.js, no ChromaDB, no HTTP worker).
