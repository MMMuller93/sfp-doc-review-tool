# Elite Engineer Cockpit v3.1.1

**HOTFIX (v3.1.1)**: Fixed critical `CLAUDE_PROJECT_ROOT` dependency issue. Hooks now work out-of-the-box!

A working enforcement system for Claude Code that combines:
- **Real hook enforcement** (v3's working hooks)
- **Ralph-style autonomous looping** (from Ralph Wiggum)
- **Gastown orchestration** (restored from v2)
- **Collaborative dialogue** (restored from v2)

## What's New in v3.1

### From Ralph Wiggum
- `/auto` command for autonomous task completion
- Completion promise pattern (`<promise>TEXT</promise>`)
- Iteration tracking and max iteration limits
- Stop hook that re-injects prompts until complete

### Restored from v2
- **Gastown Orchestration**: Mayor, Polecats, Convoys
- **Collaborative Dialogue**: `/dialogue` command for agent collaboration
- **Memory Protocol**: Detailed memory system with team dynamics
- **Context Resilience**: Checkpoint, handoff, and recovery protocols
- **Model Selection**: Guidance on which model for which agent

### Kept from v3
- Working hook format (correct Claude Code format)
- State management (JSON-based)
- Enforcement mechanism (blocks Write/Edit without dispatch)
- User override (`/bypass`)

## Quick Start

```bash
# Copy to your project
cp -r .claude /your/project/
cp -r .llm /your/project/
cp CLAUDE.md /your/project/

# Make hooks executable
chmod +x /your/project/.claude/hooks/*.py
chmod +x /your/project/.claude/hooks/*.sh

# Start Claude Code
cd /your/project && claude
```

## Usage

### Standard Dispatch
```
User: "Build an auth system"
Claude: [Analyzes complexity → Medium mode]
        "Dispatching to Spec agent..."
        [Spec → Planner → Coder → Reviewer → Tester → Witness]
```

### Autonomous Loop
```
/auto "Build auth system with tests" --max-iterations 20 --promise "ALL_TESTS_PASSING"
```

Claude will:
1. Work on the task using the dispatch pipeline
2. When trying to exit, get the prompt re-injected
3. Continue until outputting `<promise>ALL_TESTS_PASSING</promise>`
4. Or until 20 iterations reached

### Collaborative Dialogue
```
/dialogue spec,researcher "What auth patterns exist in the codebase?"
```

Agents will dialogue to reach consensus before proceeding.

## File Structure

```
.claude/
├── settings.json              # Permissions + hooks
├── cockpit-state.json         # Runtime state
├── auto-loop.local.md         # Auto-loop state (when active)
├── gastown-state.json         # Gastown state
├── agents/                    # 10 agent definitions
├── commands/                  # 7 slash commands
└── hooks/                     # 7 enforcement hooks

.llm/
├── shared_memory.md           # Project-wide learnings
├── project_state.md           # Current state
├── dispatch_log.md            # Audit trail
├── todo.md                    # Task list
└── memories/
    ├── team_dynamics.md       # Collaboration patterns
    └── user_profile.md        # User preferences

.beads/
└── formulas/                  # Reusable workflows
```

## Commands

| Command | Purpose |
|---------|---------|
| `/dispatch [agent] [task]` | Dispatch to any agent |
| `/auto [task] [options]` | Start autonomous loop |
| `/cancel-auto` | Cancel active loop |
| `/dialogue [agents] [topic]` | Start agent dialogue |
| `/bypass` | Disable enforcement |
| `/witness` | Verify completion |
| `/status` | Show current state |

## Hooks

| Hook | Event | Purpose |
|------|-------|---------|
| `user-prompt-submit.py` | UserPromptSubmit | Analyzes complexity |
| `verify-dispatch.py` | PreToolUse | Blocks without dispatch |
| `update-state.py` | PostToolUse | Tracks progress |
| `verify-witness.py` | Stop | Auto-loop OR witness check |
| `session-start.py` | SessionStart | Restores state |
| `pre-compact.py` | PreCompact | Saves state |
| `setup-auto-loop.sh` | Command | Initializes auto-loop |

## Agents

| Agent | Purpose |
|-------|---------|
| Spec | Defines scope and criteria |
| Planner | Breaks into tasks |
| Coder | Implements |
| Reviewer | Validates quality |
| Tester | Writes and runs tests |
| Witness | Verifies completion |
| Researcher | Gathers context |
| Triage | Classifies issues |
| Mayor | Gastown coordinator |
| Polecat | Parallel worker |

## Version History

- **v3.1.1** (2026-01-14): HOTFIX - Fixed CLAUDE_PROJECT_ROOT dependency, hooks now work immediately
- **v3.1** (2026-01-13): Added Ralph-style auto-loop, restored Gastown and dialogue
- **v3.0** (2026-01-13): Working hooks, correct format, enforcement mechanism
- **v2.0** (Previous): Comprehensive documentation, no actual enforcement
