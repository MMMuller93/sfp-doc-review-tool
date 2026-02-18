#!/usr/bin/env python3
"""
Elite Cockpit — PreCompact Hook

Fires before Claude compacts context. Saves state to prevent data loss
during context window compression.
"""

import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import load_state, save_state, allow, PROJECT_ROOT


def main():
    state = load_state()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    # 1. Append checkpoint to project_state.md
    project_state_file = os.path.join(PROJECT_ROOT, ".llm", "project_state.md")
    os.makedirs(os.path.dirname(project_state_file), exist_ok=True)

    checkpoint = (
        f"\n---\n## Checkpoint: {timestamp} (pre-compact)\n"
        f"- **Mode**: {state.get('mode', 'unknown')}\n"
        f"- **Phase**: {state.get('phase', 'unknown')}\n"
        f"- **Agent**: {state.get('current_agent', 'none')}\n"
        f"- **Task**: {state.get('task_description', 'none')}\n"
    )

    files_touched = state.get("files_touched", [])
    if files_touched:
        recent = files_touched[-10:]
        checkpoint += f"- **Recent files**: {', '.join(os.path.basename(f) for f in recent)}\n"

    checkpoint += "\n"

    try:
        with open(project_state_file, "a") as f:
            f.write(checkpoint)
    except OSError:
        pass

    # 2. Store compaction marker in structured memory
    try:
        from memory_db import init_db, store_observation, get_current_session_id
        init_db(PROJECT_ROOT)
        sid = (
            state.get("current_session_id")
            or get_current_session_id(PROJECT_ROOT)
            or "untracked"
        )
        store_observation(
            PROJECT_ROOT, sid, "discovery",
            title="Context compaction occurred",
            narrative=(
                f"Mode: {state.get('mode')}, Phase: {state.get('phase')}, "
                f"Agent: {state.get('current_agent')}"
            ),
            concepts=["compaction", "context-loss"],
            agent="system",
        )
    except Exception:
        pass  # Fail-open

    allow()


if __name__ == "__main__":
    main()
