---
name: recall
description: Search structured memory for past learnings and observations
---

# /recall — Search Structured Memory

Search the SQLite memory database for past observations, decisions, corrections, and learnings.

## Instructions

Parse the user's input after `/recall` and search structured memory using the `search_memory()` function from `lib.py` (or directly via `memory_db.py`).

### Search Strategy

1. If the input contains `--type <type>`, filter by observation type:
   - `decision`, `bugfix`, `feature`, `refactor`, `discovery`, `change`, `correction`, `pattern`
2. If the input contains `--session latest`, show observations from the most recent completed session
3. Otherwise, use the input as a full-text search query

### Display Format

**Summary (always show):**

```
Found [N] observations matching "[query]":

| # | Type | Title | Agent | Date |
|---|------|-------|-------|------|
| 1 | [type] | [title] | [agent] | [YYYY-MM-DD] |
```

**Details (show for top 3-5 results):**

For each top result, show:
- Title and type
- Narrative excerpt (first 200 chars)
- Concepts/tags if present
- Files touched if present

**Token estimate:**
```
Results: ~[N] estimated tokens
```

### Usage Examples

```
/recall auth patterns       # Search for auth-related observations
/recall --type correction   # Show all user corrections
/recall --type pattern      # Show all discovered patterns
/recall --session latest    # Show observations from last session
/recall database schema     # Full-text search for database schema work
```

### Implementation

Use this Python code pattern to execute the search:

```python
import sys, os
sys.path.insert(0, os.path.join(PROJECT_ROOT, '.claude', 'hooks'))
from memory_db import init_db, search_observations, get_recent_observations, get_session_observations, get_recent_sessions

init_db(PROJECT_ROOT)

# For FTS search:
results = search_observations(PROJECT_ROOT, query, limit=10)

# For type filter:
results = get_recent_observations(PROJECT_ROOT, limit=20, obs_type="correction")

# For latest session:
sessions = get_recent_sessions(PROJECT_ROOT, limit=1)
if sessions:
    results = get_session_observations(PROJECT_ROOT, sessions[0]["id"])
```

Display results in the summary + details format above. If no results found, say so and suggest alternative queries.
