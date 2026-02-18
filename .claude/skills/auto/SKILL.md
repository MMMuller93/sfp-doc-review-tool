---
name: auto
description: Start an autonomous loop that continues until task is complete
---

# /auto — Autonomous Loop

Start a Ralph-style autonomous loop that continues until the task is complete.

## Usage

`/auto "task description" --max-iterations N --promise "COMPLETION_TEXT"`

## Behavior

1. Parse arguments:
   - **task**: The quoted task description (required)
   - **--max-iterations**: Maximum loop iterations (default: 20)
   - **--promise**: The completion promise text (default: "DONE")

2. Create `.claude/auto-loop.local.md` with the parsed config:
   ```yaml
   ---
   task: <task>
   max_iterations: <N>
   promise: <promise text>
   current_iteration: 1
   ---
   ```

3. Begin working on the task using the dispatch pipeline:
   - Analyze complexity (light/medium/full)
   - Follow the appropriate pipeline
   - The Stop hook will intercept exit attempts

4. The `verify-witness.py` hook manages the loop:
   - Checks for `<promise>COMPLETION_TEXT</promise>` in output
   - If not found and iterations remain: re-injects the task prompt
   - If found or max iterations reached: allows exit

5. The Witness agent should output the completion promise when ALL acceptance criteria are genuinely verified

## Rules

- **NEVER** output a false completion promise to escape the loop
- **ALWAYS** verify criteria are actually met before outputting the promise
- The loop is a forcing function for thoroughness, not something to escape

## Examples

```
/auto "Build auth system with login, logout, and session management" --max-iterations 20 --promise "ALL_TESTS_PASSING"
/auto "Fix all TypeScript errors in src/" --max-iterations 10 --promise "ZERO_ERRORS"
/auto "Refactor the payment module" --promise "DONE"
```
