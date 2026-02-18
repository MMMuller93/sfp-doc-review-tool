---
name: dispatch
description: Dispatch to any agent with a specific task
---

# /dispatch — Dispatch to Agent

The user wants to dispatch to a specific agent. Parse the arguments to extract the agent name and task.

## Usage

`/dispatch [agent-name] [task description]`

## Behavior

1. Parse the first word as the agent name, the rest as the task description
2. Validate the agent exists in `.claude/agents/[name].md`
3. Read the agent definition file
4. Update `.claude/cockpit-state.json`:
   - Set `current_agent` to the agent name
   - Set `phase` to the appropriate phase for that agent
5. Log to `.llm/dispatch_log.md`
6. Announce: "Dispatching to [Agent Name]..."
7. Adopt the agent's role and follow its protocol exactly
8. On completion, announce: "[Agent] complete. Output: [summary]"
9. Return to Dispatcher mode (clear `current_agent`)

## Available Agents

- `spec` — Define scope and acceptance criteria
- `planner` — Break spec into tasks
- `coder` — Implement code
- `reviewer` — Validate code quality
- `tester` — Write and run tests
- `witness` — Verify completion
- `researcher` — Explore codebase
- `triage` — Classify and route
- `mayor` — Gastown coordination
- `polecat` — Parallel worker

## Example

```
/dispatch spec Build a user authentication system
/dispatch coder Implement the login endpoint per the approved plan
/dispatch researcher What auth patterns exist in this codebase?
```
