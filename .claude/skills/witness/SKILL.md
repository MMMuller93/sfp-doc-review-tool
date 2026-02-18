---
name: witness
description: Verify task completion and log results
---

# /witness — Verify Completion

Dispatch to the Witness agent to verify that the current task is complete.

## Behavior

1. Load the current cockpit state from `.claude/cockpit-state.json`
2. Read the Witness agent definition from `.claude/agents/witness.md`
3. Set `current_agent` to "witness"
4. Execute the Witness protocol:
   - Check all acceptance criteria
   - Verify code changes are complete
   - Verify tests pass (if applicable)
   - Update memory files
5. If all criteria pass:
   - Set phase to "complete"
   - Output completion promise (if auto-loop active)
   - Log to dispatch_log.md and shared_memory.md
6. If criteria fail:
   - Report what's missing
   - Recommend next steps
