#!/usr/bin/env python3
"""
Elite Cockpit — SessionStart Hook

Fires when a new session begins. Restores state from previous session
and injects memory context via systemMessage.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import load_state, save_state, PROJECT_ROOT


def main():
    context_parts = []

    # 1. Read project_state.md for human-readable resume info
    project_state_file = os.path.join(PROJECT_ROOT, ".llm", "project_state.md")
    if os.path.exists(project_state_file):
        try:
            with open(project_state_file, "r") as f:
                content = f.read().strip()
            if content:
                context_parts.append(f"## Project State\n\n{content}")
        except OSError:
            pass

    # 2. Restore cockpit state
    state = load_state()
    if state:
        mode = state.get("mode", "light")
        phase = state.get("phase", "idle")
        agent = state.get("current_agent")
        task = state.get("task_description")

        status_lines = [f"## Cockpit State\n"]
        status_lines.append(f"- **Mode**: {mode}")
        status_lines.append(f"- **Phase**: {phase}")
        if agent:
            status_lines.append(f"- **Active Agent**: {agent}")
        if task:
            status_lines.append(f"- **Last Task**: {task[:100]}")
        context_parts.append("\n".join(status_lines))

    # 3. SQLite memory context injection
    try:
        from memory_db import init_db, create_session, get_context_summary
        init_db(PROJECT_ROOT)

        # Create new session
        session_id = create_session(PROJECT_ROOT, mode=state.get("mode", "light"))
        state["current_session_id"] = session_id
        save_state(state)

        # Get progressive context summary
        memory_context = get_context_summary(PROJECT_ROOT, token_budget=2000)
        if memory_context.strip():
            context_parts.append(f"## Memory Context\n\n{memory_context}")
    except Exception:
        pass  # Fail-open

    # Build final system message
    if context_parts:
        full_context = "\n\n---\n\n".join(context_parts)
        print(json.dumps({
            "decision": "allow",
            "systemMessage": full_context,
        }))
    else:
        print(json.dumps({"decision": "allow"}))

    sys.exit(0)


if __name__ == "__main__":
    main()
