---
name: cancel-auto
description: Cancel the active autonomous loop
---

# /cancel-auto — Cancel Auto-Loop

Cancel the currently active autonomous loop.

## Behavior

1. Check if `.claude/auto-loop.local.md` exists
2. If it exists:
   - Read it to show the current task and iteration count
   - Delete the file
   - Announce: "Auto-loop cancelled. Was on iteration N/M for task: [task]"
3. If it doesn't exist:
   - Announce: "No active auto-loop to cancel."
