#!/usr/bin/env python3
"""
Elite Cockpit — Stop Hook

Fires when Claude tries to stop. Two responsibilities:
1. Auto-loop: re-inject prompt if task not complete
2. Witness check: block if medium/full mode and witness not run
"""

import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import load_state, save_state, allow, deny, PROJECT_ROOT, AUTO_LOOP_FILE


# ============================================================================
# Auto-Loop Helpers
# ============================================================================

def parse_auto_loop() -> dict | None:
    """Parse auto-loop config if active. Returns None if inactive."""
    if not os.path.exists(AUTO_LOOP_FILE):
        return None

    try:
        with open(AUTO_LOOP_FILE, "r") as f:
            content = f.read()

        config = {}
        # Parse YAML-style frontmatter
        fm_match = re.search(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
        if fm_match:
            for line in fm_match.group(1).split("\n"):
                if ":" in line:
                    key, val = line.split(":", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    if key == "max_iterations":
                        val = int(val)
                    elif key == "current_iteration":
                        val = int(val)
                    config[key] = val

        return config if config.get("task") else None
    except Exception:
        return None


def increment_iteration(config: dict) -> None:
    """Increment the current_iteration in the auto-loop file."""
    try:
        with open(AUTO_LOOP_FILE, "r") as f:
            content = f.read()

        current = config.get("current_iteration", 1)
        new_val = current + 1
        content = re.sub(
            r"current_iteration:\s*\d+",
            f"current_iteration: {new_val}",
            content,
        )

        with open(AUTO_LOOP_FILE, "w") as f:
            f.write(content)
    except Exception:
        pass


def end_session(summary: str) -> None:
    """End the current structured memory session."""
    try:
        from memory_db import init_db, get_current_session_id, end_session as _end
        init_db(PROJECT_ROOT)
        session_id = get_current_session_id(PROJECT_ROOT)
        if session_id:
            _end(PROJECT_ROOT, session_id, summary=summary)
    except Exception:
        pass


# ============================================================================
# Main
# ============================================================================

def main():
    state = load_state()
    bypass = state.get("bypass_active", False)

    if bypass:
        end_session("Session ended (bypass active)")
        allow()

    # --- Auto-Loop Check ---
    loop = parse_auto_loop()
    if loop:
        current = loop.get("current_iteration", 1)
        maximum = loop.get("max_iterations", 20)
        promise = loop.get("promise", "DONE")
        task = loop.get("task", "unknown task")

        # Check if max iterations reached
        if current >= maximum:
            end_session(f"Auto-loop max iterations reached ({maximum})")
            allow()

        # Increment and re-inject
        increment_iteration(loop)
        deny(
            f"AUTO-LOOP ACTIVE — Iteration {current + 1}/{maximum}\n\n"
            f"Task: {task}\n"
            f"Completion promise: <promise>{promise}</promise>\n\n"
            f"Continue working on the task. Output the completion promise "
            f"when ALL criteria are genuinely met.",
            interrupt=False,
        )

    # --- Witness Check ---
    mode = state.get("mode", "light")
    phase = state.get("phase", "idle")

    if mode in ("medium", "full") and phase not in ("complete", "idle", "direct"):
        deny(
            "WITNESS REQUIRED\n\n"
            f"Mode: {mode.upper()} | Phase: {phase}\n\n"
            "Run `/witness` to verify task completion before finishing.\n"
            "Or run `/bypass` to override."
        )
    else:
        end_session(f"Session ended cleanly (mode={mode}, phase={phase})")
        allow()


if __name__ == "__main__":
    main()
