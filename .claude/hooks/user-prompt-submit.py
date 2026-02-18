#!/usr/bin/env python3
"""
Elite Cockpit — UserPromptSubmit Hook

Fires on every user prompt. Analyzes complexity, sets mode, and
optionally creates a structured memory session.
"""

import json
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import load_state, save_state, allow, PROJECT_ROOT


# ============================================================================
# Complexity Analysis
# ============================================================================

# Keywords that suggest higher complexity
PHASE_KEYWORDS = [
    "spec", "design", "plan", "implement", "build", "test", "deploy",
    "migrate", "refactor", "rewrite", "integrate", "configure",
]
VALIDATION_KEYWORDS = [
    "production", "critical", "safe", "security", "auth", "migration",
    "database", "schema", "deploy",
]
PARALLEL_MARKERS = [
    " and ", " also ", " plus ", " additionally ",
    "1.", "2.", "3.",
    "- ", "* ",
]


def estimate_complexity(prompt: str) -> int:
    """Estimate minutes of work from prompt text. Rough heuristic."""
    words = len(prompt.split())
    if words < 20:
        return 10
    elif words < 60:
        return 25
    else:
        return 45


def count_phases(prompt: str) -> int:
    """Count how many distinct phases the prompt implies."""
    lower = prompt.lower()
    return sum(1 for kw in PHASE_KEYWORDS if kw in lower)


def requires_strict_validation(prompt: str) -> bool:
    """Check if prompt mentions high-stakes keywords."""
    lower = prompt.lower()
    return any(kw in lower for kw in VALIDATION_KEYWORDS)


def count_independent_tasks(prompt: str) -> int:
    """Rough count of independent sub-tasks."""
    lower = prompt.lower()
    score = 0
    for marker in PARALLEL_MARKERS:
        if marker in lower:
            score += 1
    return min(score, 3)  # Cap at 3


def analyze_triggers(prompt: str) -> dict:
    """Count complexity triggers and determine mode."""
    triggers = []

    # 1. Complexity: >30 min estimated
    if estimate_complexity(prompt) > 30:
        triggers.append("complexity")

    # 2. Phases: 3+ distinct phases
    if count_phases(prompt) >= 3:
        triggers.append("phases")

    # 3. Context: check state for token pressure (simplified)
    state = load_state()
    if state.get("context_tokens", 0) > 30000:
        triggers.append("context")

    # 4. Validation: strict quality gates needed
    if requires_strict_validation(prompt):
        triggers.append("validation")

    # 5. Parallelism: 2+ independent tasks
    if count_independent_tasks(prompt) >= 2:
        triggers.append("parallelism")

    count = len(triggers)
    if count <= 1:
        mode = "light"
    elif count == 2:
        mode = "medium"
    else:
        mode = "full"

    return {
        "triggers": triggers,
        "count": count,
        "mode": mode,
    }


# ============================================================================
# Main
# ============================================================================

def main():
    try:
        input_data = sys.stdin.read()
        hook_input = json.loads(input_data) if input_data.strip() else {}
    except (json.JSONDecodeError, OSError):
        hook_input = {}

    prompt = hook_input.get("prompt", "")

    # Skip complexity analysis for slash commands
    if prompt.strip().startswith("/"):
        allow()

    analysis = analyze_triggers(prompt)

    # Update state
    state = load_state()
    state["mode"] = analysis["mode"]
    state["triggers"] = analysis["triggers"]
    state["task_description"] = prompt[:200] if prompt else None
    state["timestamp"] = __import__("datetime").datetime.now().isoformat()

    if analysis["mode"] != "light":
        state["phase"] = "triage"
    else:
        state["phase"] = "direct"

    save_state(state)

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

    # Inject mode context for medium/full
    if analysis["mode"] in ("medium", "full"):
        msg = (
            f"## Cockpit Mode: {analysis['mode'].upper()}\n\n"
            f"**Triggers:** {', '.join(analysis['triggers'])}\n\n"
        )
        if analysis["mode"] == "full":
            msg += (
                "**Full Process active.** Use the dispatch pipeline:\n"
                "Spec -> Plan -> Code -> Review -> Test -> Witness\n\n"
                "Gastown Mayor oversight is available for coordination.\n"
            )
        else:
            msg += (
                "**Medium Process active.** Dispatch pipeline required.\n"
                "Triage first, then route to appropriate agents.\n"
            )
        allow(system_message=msg)
    else:
        allow()


if __name__ == "__main__":
    main()
