---
name: bypass
description: Toggle enforcement on/off
---

# /bypass — Toggle Enforcement

Disable or re-enable the cockpit enforcement hooks.

## Usage

- `/bypass` — Disable enforcement (bypass ON)
- `/bypass off` — Re-enable enforcement (bypass OFF)

## Behavior

1. Parse argument (if any):
   - No argument or "on": set `bypass_active = true`
   - "off": set `bypass_active = false`
2. Update `.claude/cockpit-state.json` with the new bypass state
3. Announce the change:
   - "Bypass ENABLED — enforcement hooks disabled. Run `/bypass off` to re-enable."
   - "Bypass DISABLED — enforcement hooks re-enabled."

## What Bypass Affects

When bypass is active:
- `verify-dispatch.py` allows all Write/Edit operations
- `verify-witness.py` allows session to end without witness
- Complexity analysis still runs (for tracking) but doesn't enforce

## When to Use

- Urgent fixes that can't wait for the full pipeline
- Experimenting or prototyping
- When the enforcement is getting in the way of a specific workflow

Remember to run `/bypass off` when done to restore enforcement.
