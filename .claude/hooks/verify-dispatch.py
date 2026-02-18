#!/usr/bin/env python3
"""
Elite Cockpit — PreToolUse Hook (Write|Edit matcher)

Blocks code changes if the current mode requires dispatch
but no agent is active. Enforces the dispatch pipeline.
"""

import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import load_state, allow, deny


# Agents that are allowed to write/edit code
CODING_AGENTS = {"coder", "tester", "reviewer", "researcher", "polecat"}

# File patterns that are always allowed (state/memory files)
ALWAYS_ALLOW_PATTERNS = (
    ".claude/cockpit-state.json",
    ".claude/auto-loop.local.md",
    ".claude/gastown-state.json",
    ".llm/",
)


def main():
    try:
        input_data = sys.stdin.read()
        hook_input = json.loads(input_data) if input_data.strip() else {}
    except (json.JSONDecodeError, OSError):
        hook_input = {}

    state = load_state()
    mode = state.get("mode", "light")
    bypass = state.get("bypass_active", False)
    current_agent = state.get("current_agent")

    # Always allow if bypass is active
    if bypass:
        allow()

    # Always allow in light mode (direct coding)
    if mode == "light":
        allow()

    # Always allow state/memory file edits
    tool_input = hook_input.get("tool_input", {})
    file_path = tool_input.get("file_path", "")
    for pattern in ALWAYS_ALLOW_PATTERNS:
        if pattern in file_path:
            allow()

    # Allow if a coding agent is active
    if current_agent in CODING_AGENTS:
        allow()

    # Block — dispatch required
    deny(
        "DISPATCH REQUIRED\n\n"
        f"Current mode: {mode.upper()} ({', '.join(state.get('triggers', []))})\n"
        f"Current agent: {current_agent or 'none'}\n\n"
        "You must dispatch to an agent (coder, tester, etc.) before writing code.\n"
        "Use `/dispatch coder <task>` or `/bypass` to override."
    )


if __name__ == "__main__":
    main()
