---
name: status
description: Show current cockpit state and progress
---

# /status — Show Cockpit Status

Display the current state of the Elite Cockpit.

## Behavior

1. Read `.claude/cockpit-state.json`
2. Check for active auto-loop (`.claude/auto-loop.local.md`)
3. Check for active Gastown (`.claude/gastown-state.json`)
4. Display a formatted status report:

```
## Cockpit Status

| Property | Value |
|----------|-------|
| Mode | light / medium / full |
| Phase | idle / triage / spec / plan / code / review / test / witness / complete |
| Agent | (current agent or none) |
| Bypass | active / inactive |
| Triggers | (list of triggered items) |

### Auto-Loop
Status: active / inactive
Task: (if active)
Iteration: N / M

### Gastown
Mayor: active / inactive
Convoys: N active
Polecats: N running

### Recent Files
- (last 5 files touched)
```

5. If there are issues or recommendations, note them:
   - "Phase is 'code' but no agent is active — dispatch a coder"
   - "Auto-loop at iteration 18/20 — close to max"
