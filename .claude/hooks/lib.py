#!/usr/bin/env python3
"""
Elite Cockpit v3.1.1 — Shared Hook Utilities

Common functions used by all enforcement hooks.
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

# ============================================================================
# Project Root Detection
# ============================================================================

# Prefer env var, fall back to walking up from this script's location
PROJECT_ROOT = os.getenv("CLAUDE_PROJECT_ROOT") or str(
    Path(__file__).resolve().parent.parent.parent
)

# ============================================================================
# File Paths
# ============================================================================

STATE_FILE = os.path.join(PROJECT_ROOT, ".claude", "cockpit-state.json")
SHARED_MEMORY = os.path.join(PROJECT_ROOT, ".llm", "shared_memory.md")
PROJECT_STATE = os.path.join(PROJECT_ROOT, ".llm", "project_state.md")
DISPATCH_LOG = os.path.join(PROJECT_ROOT, ".llm", "dispatch_log.md")
AUTO_LOOP_FILE = os.path.join(PROJECT_ROOT, ".claude", "auto-loop.local.md")


# ============================================================================
# State Management
# ============================================================================

def load_state() -> dict:
    """Load cockpit state from JSON. Returns empty dict if missing/corrupt."""
    try:
        if os.path.exists(STATE_FILE):
            with open(STATE_FILE, "r") as f:
                return json.load(f)
    except (json.JSONDecodeError, OSError):
        pass
    return {}


def save_state(state: dict) -> None:
    """Save cockpit state to JSON. Creates parent dirs if needed."""
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


# ============================================================================
# Hook Response Helpers
# ============================================================================

def allow(system_message: str = None) -> None:
    """Output allow decision and exit cleanly."""
    response = {"decision": "allow"}
    if system_message:
        response["systemMessage"] = system_message
    print(json.dumps(response))
    sys.exit(0)


def deny(message: str, interrupt: bool = True) -> None:
    """Output deny decision and exit."""
    print(json.dumps({
        "decision": "deny",
        "message": message,
        "interrupt": interrupt,
    }))
    sys.exit(0)


# ============================================================================
# Markdown Memory (Legacy — Dual-Write Target)
# ============================================================================

def log_to_shared_memory(title: str, narrative: str, excerpt: str, agent: str) -> None:
    """Append an entry to shared_memory.md."""
    os.makedirs(os.path.dirname(SHARED_MEMORY), exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    entry = (
        f"\n### [{timestamp}] {title}\n"
        f"- **Agent**: {agent}\n"
        f"- **Learning**: {narrative}\n\n"
    )
    with open(SHARED_MEMORY, "a") as f:
        f.write(entry)


def log_dispatch(agent: str, task: str, result: str = None) -> None:
    """Append an entry to dispatch_log.md."""
    os.makedirs(os.path.dirname(DISPATCH_LOG), exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = (
        f"\n### [{timestamp}] Dispatched → {agent}\n"
        f"- **Task**: {task}\n"
    )
    if result:
        entry += f"- **Result**: {result}\n"
    entry += "\n"
    with open(DISPATCH_LOG, "a") as f:
        f.write(entry)


# ============================================================================
# SQLite-Enhanced Memory (Dual-Write)
# ============================================================================

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
        pass  # Fail-open: markdown write already happened


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
