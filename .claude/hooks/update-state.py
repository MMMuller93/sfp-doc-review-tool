#!/usr/bin/env python3
"""
Elite Cockpit — PostToolUse Hook

Fires after every tool use. Tracks file changes in structured memory
and updates cockpit state.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import allow, PROJECT_ROOT, load_state


def main():
    try:
        input_data = sys.stdin.read()
        if not input_data.strip():
            allow()

        hook_input = json.loads(input_data)
        tool_name = hook_input.get("tool_name", "")
        tool_input = hook_input.get("tool_input", {})

        # Track file modifications
        if tool_name in ("Write", "Edit"):
            file_path = tool_input.get("file_path", "")
            if file_path and not file_path.endswith((".pyc", ".pyo")):
                # Update files_touched in state
                state = load_state()
                touched = state.get("files_touched", [])
                if file_path not in touched:
                    touched.append(file_path)
                    state["files_touched"] = touched[-50:]  # Keep last 50
                    from lib import save_state
                    save_state(state)

                # Store in structured memory
                try:
                    from memory_db import init_db, store_observation, get_current_session_id
                    init_db(PROJECT_ROOT)
                    sid = (
                        state.get("current_session_id")
                        or get_current_session_id(PROJECT_ROOT)
                        or "untracked"
                    )
                    store_observation(
                        PROJECT_ROOT, sid, "change",
                        title=f"Modified: {os.path.basename(file_path)}",
                        files_mod=[file_path],
                        agent=state.get("current_agent") or "unknown",
                    )
                except Exception:
                    pass  # Fail-open

    except Exception:
        pass  # Fail-open: never block due to tracking errors

    allow()


if __name__ == "__main__":
    main()
