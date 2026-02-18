# Boris Cherny's Claude Code Playbook

> How the creator of Claude Code and the Anthropic team actually use it — 10 best practices distilled from internal workflows.
>
> **Source thread:** https://x.com/bcherny/status/2017742741636321619
> **Official best practices:** https://www.anthropic.com/engineering/claude-code-best-practices
> **Docs:** https://code.claude.com/docs

---

## 1. Work in Parallel — "Single Biggest Productivity Unlock"

Run 3–5 Claude sessions at the same time, each in its own git worktree. A worktree is a separate checkout of the same repo — its own branch, its own files, its own Claude context. No interference between sessions.

```bash
# Create worktrees
git worktree add ../feature-auth -b feature/auth
git worktree add ../bugfix-123 bugfix-123

# Open each in a separate terminal tab and start Claude
cd ../feature-auth && claude
cd ../bugfix-123 && claude

# List all worktrees
git worktree list

# Clean up when done
git worktree remove ../feature-auth
```

**How the team organizes this:**
- Shell aliases for single-keystroke navigation: `za`, `zb`, `zc` jump between worktrees.
- A dedicated "analysis" worktree for logs, BigQuery queries, and exploratory data work — kept separate from active development.
- Descriptive worktree names (task name, ticket number) so you always know what each session is doing.
- Color-coded terminal tabs — one per worktree. Some use tmux for session management.
- Remember to install dependencies / set up your environment in each new worktree.

**Notifications matter.** When you're running 3–5 sessions, you need to know when one needs input. Use iTerm2 or Ghostty's built-in notification support, or set up a Notification hook (see the hooks section below) to get desktop alerts.

Adam Morris from the team built native worktree support directly into the Claude Desktop app.

> **Docs:** [Parallel sessions with worktrees](https://code.claude.com/docs/en/common-workflows#run-parallel-claude-code-sessions-with-git-worktrees)

---

## 2. Plan Before You Code

Every complex task should start in **Plan Mode**. Plan Mode restricts Claude to read-only operations — it analyzes the codebase and proposes a strategy without touching anything.

**How to enter Plan Mode:**
- During a session: press **Shift+Tab** twice (Normal → Auto-Accept → Plan).
- From the CLI: `claude --permission-mode plan`
- As your default (in `.claude/settings.json`):
  ```json
  { "permissions": { "defaultMode": "plan" } }
  ```

**The rhythm:**
1. Enter Plan Mode. Describe the problem.
2. Go back and forth with Claude on the plan until you're satisfied.
3. Switch to Auto-Accept mode (Shift+Tab once) and let Claude implement.
4. If things go sideways during implementation, **stop and re-plan** — don't keep pushing through a broken approach.

**Advanced moves:**
- Spin up a second Claude in another terminal to review the plan as an adversarial "staff engineer" before you implement.
- Have Claude save its plan to a markdown file or GitHub issue so you can reset to that point if implementation doesn't work out.
- Use the word "think" to trigger extended thinking. The specific phrases map to increasing thinking budget: **"think" < "think hard" < "think harder" < "ultrathink"**.

> **Docs:** [Plan Mode](https://code.claude.com/docs/en/common-workflows#use-plan-mode-for-safe-code-analysis)

---

## 3. Invest in Your CLAUDE.md

CLAUDE.md is a special file that Claude reads at the start of every conversation. It's your persistent context — bash commands, code style, workflow rules, testing instructions, project-specific quirks.

**The core habit:** After every correction, tell Claude: *"Update your CLAUDE.md so you don't make that mistake again."* Claude is surprisingly good at writing rules for itself. Keep iterating until the mistake rate measurably drops.

**Keep it short.** This is the most common pitfall: an over-specified CLAUDE.md that's so long Claude ignores half of it. Important rules get lost in noise. Ruthlessly prune. If Claude already does something correctly without the instruction, delete it. If something must happen every time without fail, convert it to a hook instead.

**Where CLAUDE.md files live:**
- **Repo root** — checked into git, shared with the team. This is the main one.
- **Parent directories** — for monorepos. Claude loads both root and subdirectory files.
- **Child directories** — loaded on-demand when Claude works with files in those directories.
- **Home** (`~/.claude/CLAUDE.md`) — applies to all your sessions everywhere.
- **Local** (`CLAUDE.local.md`) — gitignored, personal overrides.

**Team workflow:**
- Everyone contributes to the same CLAUDE.md. The team updates it multiple times a week.
- During code review: tag `@claude` on a PR to add corrections as CLAUDE.md updates in the same PR. Every mistake becomes a rule.
- Press `#` during any session to add an instruction that Claude incorporates automatically.
- Run `/init` to generate a starter CLAUDE.md from your project structure, then refine from there.
- For deeper per-task context, maintain a `notes/` directory and point CLAUDE.md entries to those notes.

**Example CLAUDE.md:**
```markdown
# Bash commands
- npm run build: Build the project
- npm run typecheck: Run the typechecker

# Code style
- Use ES modules (import/export), not CommonJS (require)
- Destructure imports when possible

# Workflow
- Typecheck when done making code changes
- Prefer running single tests, not the whole suite, for performance
```

> **Docs:** [Using CLAUDE.md files](https://claude.com/blog/using-claude-md-files) · [Best practices](https://www.anthropic.com/engineering/claude-code-best-practices)

---

## 4. Build Skills and Slash Commands

If you do something more than once a day, turn it into a skill or slash command. Check it into git so the team can reuse it.

Slash commands and skills have been merged — a file at `.claude/commands/review.md` and a skill at `.claude/skills/review/SKILL.md` both create `/review` and work the same way. Skills add optional features: supporting file directories, frontmatter to control invocation, and automatic loading when relevant.

**Where to put them:**
- **Project** (shared via git): `.claude/commands/` or `.claude/skills/`
- **Personal** (all projects): `~/.claude/commands/` or `~/.claude/skills/`

**Simple command example:**
```markdown
# .claude/commands/fix-issue.md
---
argument-hint: [issue-number]
description: Fix a GitHub issue
disable-model-invocation: true
---

Fix GitHub issue #$ARGUMENTS following our coding standards.

1. Use `gh issue view $ARGUMENTS` to get issue details
2. Search the codebase for relevant files
3. Implement the fix
4. Write and run tests
5. Ensure lint and typecheck pass
6. Commit, push, and create a PR with `gh pr create`
```

Usage: `/fix-issue 1234`

**Skill with forked context** (runs as an isolated subagent):
```markdown
# .claude/skills/research/SKILL.md
---
name: research-codebase
description: Explore codebase in isolation
context: fork
agent: Explore
---

Investigate $ARGUMENTS in the codebase.
Report: architecture, key files, patterns, and recommendations.
```

The `context: fork` directive makes this run in its own context window. Results are summarized and returned to your main conversation.

**What the Claude Code team uses:**
- `/commit-push-pr` — full git workflow, used dozens of times daily.
- `/techdebt` — finds duplicated code and suggests cleanup at end of session.
- A sync command that pulls 7 days of Slack, Google Drive, Asana, and GitHub into one context dump.
- Analytics agents that write dbt models, review code, and test in dev environments.
- The open-sourced `code-simplifier` plugin: `claude plugin install code-simplifier`

**Controlling which skills Claude can invoke** (in `/permissions`):
```
Skill(commit)          # Allow exact match
Skill(review-pr *)     # Allow prefix match
Skill(deploy *)        # Deny prefix match
```

> **Docs:** [Skills](https://code.claude.com/docs/en/skills) · [Slash commands reference](https://code.claude.com/docs/en/slash-commands)

---

## 5. Let Claude Fix Bugs Autonomously

Give Claude the objective, not the steps. It's surprisingly capable at determining its own debugging strategy.

- Paste a Slack bug thread and say **"fix."**
- Say **"Go fix the failing CI tests"** and walk away.
- Point Claude at Docker logs for distributed systems debugging.
- Enable the Slack MCP server so Claude pulls bug context directly without copy-pasting.

**The anti-pattern to avoid:** Correcting over and over. Claude gets something wrong, you correct it, it's still wrong, you correct again — and now the context is polluted with failed approaches. After two failed corrections, use `/clear` and write a better initial prompt that incorporates what you learned.

> **Docs:** [Best practices — common anti-patterns](https://code.claude.com/docs/en/best-practices)

---

## 6. Level Up Your Prompting

Specificity on the first attempt eliminates course corrections later.

| Weak prompt | Strong prompt |
|---|---|
| add tests for foo.py | write tests for foo.py covering the edge case where the user is logged out. avoid mocks |
| why is this api weird? | look through ExecutionFactory's git history and summarize how its api evolved |
| add a calendar widget | look at how existing widgets work (start with HotDogWidget.php). follow that pattern to build a calendar widget with month selection and year pagination. no external libraries beyond what's already in the codebase. |

**Advanced techniques from the team:**
- **Make Claude the gatekeeper:** "Grill me on these changes and don't make a PR until I pass your test."
- **Demand elegance after a mediocre first pass:** "Knowing everything you know now, scrap this and implement the elegant solution."
- **Write detailed specs** and reduce ambiguity — the more specific and unambiguous, the better the output.
- **Use voice dictation for prompts.** You speak 3x faster than you type, and prompts become significantly more detailed as a result. On macOS, press **fn** twice to activate dictation.

**Course correction tools:**
- Press **Escape** to interrupt Claude mid-thought or mid-action. Context is preserved — you can redirect.
- **Double-tap Escape** to jump back in history and edit a previous prompt to explore a different direction.
- Ask Claude to undo changes, then try a different approach.

> **Docs:** [Best practices — be specific](https://www.anthropic.com/engineering/claude-code-best-practices)

---

## 7. Terminal and Environment Setup

**The team's terminal: Ghostty** — synchronized rendering, 24-bit color, proper Unicode. Any modern terminal works, but the team standardized on this one.

**Key setup:**
- Run `/statusline` to persistently display context usage and current git branch at the bottom of your terminal.
- Color-code and name your terminal tabs — one per task or worktree. Some use tmux for session management.
- Set up desktop notifications so background Claude sessions can alert you when they need input. The `Notification` hook (see below) handles this.

**Essential tools:**
- **Install the `gh` CLI.** Claude uses it for creating issues, PRs, reading comments, and more. Without it, unauthenticated API calls hit rate limits.
- **Connect MCP servers** for the services you use: Slack, Sentry, Puppeteer, databases, Figma, Notion, etc.
  ```bash
  claude mcp add  # Interactive setup
  ```
- Check shared MCP config into `.mcp.json` at the repo root so every engineer gets the tools automatically.

> **Docs:** [Terminal configuration](https://code.claude.com/docs/en/terminal-config)

---

## 8. Subagents — Scale Compute, Protect Context

Context is your most important resource. As conversations grow, Claude's performance degrades. Subagents let you offload exploration and research to separate context windows — they do the work and report back summaries.

**How to use them:**
- Append "use subagents" to any prompt where you want more compute thrown at a problem.
- Tell Claude explicitly: "Use a subagent to review this code for security issues."

```
Use subagents to investigate how our auth system handles token refresh,
and whether we have any existing OAuth utilities I should reuse.
```

The subagent explores the codebase, reads relevant files, and reports back findings — without cluttering your main context.

**Define custom subagents** in `.claude/agents/`:
```markdown
# .claude/agents/data-analyst.md
---
name: data-analyst
description: Use proactively for data analysis tasks and queries.
tools: Bash, Read, Write
model: sonnet
---

You are a data scientist specializing in SQL and BigQuery analysis.
When invoked:
1. Understand the data analysis requirement
2. Write efficient SQL queries
3. Use bq command line tools when appropriate
4. Analyze and summarize results
5. Present findings with recommendations
```

**Subagent hooks** — attach hooks directly to a subagent's frontmatter. These only run while that subagent is active:
```markdown
# .claude/agents/code-reviewer.md
---
name: code-reviewer
description: Review code changes with automatic linting
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-command.sh $TOOL_INPUT"
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/run-linter.sh"
---

Review the code changes for correctness, style, and potential issues.
```

**PermissionRequest hooks for auto-approval.** Boris mentioned routing permission requests through Opus 4.5 via a hook to auto-approve safe operations. Here's how that works:

The `PermissionRequest` hook fires when Claude would normally show you a permission dialog. You can use a prompt-based hook to have a fast model evaluate whether the operation is safe:

```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Evaluate if this bash command is safe to auto-approve: $ARGUMENTS. Approve read-only commands, git operations, test runs, and linting. Block anything that modifies system files, installs global packages, or makes unexpected network calls. Respond with JSON.",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

The hook output schema for PermissionRequest:
```json
// To allow (optionally modify the command)
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow",
      "updatedInput": { "command": "npm run lint" }
    }
  }
}

// To deny (optionally stop Claude entirely)
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "deny",
      "message": "This command modifies production data",
      "interrupt": true
    }
  }
}
```

> **Docs:** [Subagents](https://code.claude.com/docs/en/sub-agents) · [PermissionRequest hooks](https://code.claude.com/docs/en/hooks#permissionrequest)

---

## 9. Data and Analytics Without SQL

Use Claude with database CLIs (bq, psql, or any DB CLI / MCP / API) to query and analyze data in natural language.

- The team has a BigQuery skill checked into their codebase. Describe what you want → Claude writes the query → executes → analyzes results.
- Keep a dedicated "analysis" worktree for data work (see tip #1).
- Boris: "Haven't written a line of SQL in 6+ months."

This eliminates context-switching between your editor and a SQL client. Analytical questions get answered in the same environment as your code.

---

## 10. Learn While You Code

- Enable **"Explanatory"** or **"Learning"** output style in `/config` so Claude explains the *why* behind every change, not just the what.
- Ask Claude to generate visual HTML presentations explaining unfamiliar code.
- Have Claude draw ASCII diagrams of codebases and system architectures.
- **Advanced:** Build a spaced-repetition learning skill — explain your understanding to Claude, let it probe for gaps, store results for later review.

---

## Hooks Quick Reference

Hooks run scripts at specific points in Claude's lifecycle. Unlike CLAUDE.md instructions (which are advisory), hooks are **deterministic** — they guarantee the action happens every time.

**Settings locations:**
- `~/.claude/settings.json` — user-level (all projects)
- `.claude/settings.json` — project-level (check into git for the team)
- `.claude/settings.local.json` — local overrides (not committed)

**Common patterns:**

| Hook | Purpose | Example |
|---|---|---|
| `PostToolUse` (Edit\|Write) | Auto-format after every file change | `npm run format` |
| `Notification` (permission_prompt) | Desktop alert when Claude needs input | `osascript -e 'display notification ...'` |
| `Stop` | Verify all tasks are done before Claude stops | Prompt-based: check tests pass, code formatted |
| `SessionStart` | Inject reminders at session start | `echo 'Use Bun, not npm'` |
| `PreToolUse` (Bash) | Validate bash commands before execution | Custom validation script |
| `PermissionRequest` (Bash) | Auto-approve safe operations | Prompt-based LLM evaluation |

**Full example:**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "npm run format" }]
      }
    ],
    "Notification": [
      {
        "matcher": "permission_prompt",
        "hooks": [{
          "type": "command",
          "command": "osascript -e 'display notification \"Claude needs input\" with title \"Claude Code\"'"
        }]
      }
    ],
    "Stop": [
      {
        "hooks": [{
          "type": "prompt",
          "prompt": "Check if all tasks are complete, tests pass, and code is formatted. $ARGUMENTS",
          "timeout": 30
        }]
      }
    ]
  }
}
```

**All hook events:** PreToolUse, PermissionRequest, PostToolUse, PostToolUseFailure, Notification, UserPromptSubmit, Stop, SubagentStop, PreCompact, SessionStart, SessionEnd.

> **Docs:** [Hooks guide](https://code.claude.com/docs/en/hooks-guide) · [Hooks reference](https://code.claude.com/docs/en/hooks)

---

## Anti-Patterns to Avoid

These come directly from the official best practices page:

| Anti-Pattern | What happens | Fix |
|---|---|---|
| **Over-specified CLAUDE.md** | Too long → Claude ignores important rules | Ruthlessly prune. Convert deterministic rules to hooks. |
| **Correcting over and over** | Context gets polluted with failed approaches | After 2 failures, `/clear` and rewrite the prompt. |
| **Trust-then-verify gap** | Plausible code that doesn't handle edge cases | Always verify: tests, scripts, screenshots, CI. |
| **Infinite exploration** | "Investigate this" with no scope → hundreds of files read | Scope narrowly. Use subagents so exploration doesn't consume main context. |
| **Jumping straight to code** | Skipping planning leads to rework | Plan Mode first. "Think hard" for complex problems. |

---

## Key Principles (Summary)

1. **Parallelize** with git worktrees — 3 to 5 simultaneous sessions.
2. **Plan first**, code second. Re-plan if things go wrong.
3. **Every correction becomes a rule** in CLAUDE.md.
4. **Automate** repeated workflows into skills and slash commands.
5. **Give objectives, not steps** — trust Claude's debugging autonomy.
6. **Verify everything** — tests, screenshots, CI. Verification 2–3x's quality.
7. **Manage context** — `/clear` between tasks; subagents for exploration.
8. **Hooks for guarantees** — formatting, linting, notifications, approval flows.
9. **`/permissions`** to pre-allow safe commands (not `--dangerously-skip-permissions`).
10. **Share configs via git:** `CLAUDE.md`, `.claude/settings.json`, `.claude/commands/`, `.claude/agents/`, `.mcp.json`.

---

## Links

- **Boris Cherny's thread (10 tips):** https://x.com/bcherny/status/2017742741636321619
- **Boris Cherny's setup thread:** https://x.com/bcherny/status/2007179832300581177
- **Official best practices blog post:** https://www.anthropic.com/engineering/claude-code-best-practices
- **Claude Code docs:** https://code.claude.com/docs
- **Common workflows:** https://code.claude.com/docs/en/common-workflows
- **Hooks reference:** https://code.claude.com/docs/en/hooks
- **Subagents:** https://code.claude.com/docs/en/sub-agents
- **Skills:** https://code.claude.com/docs/en/skills
- **Using CLAUDE.md files:** https://claude.com/blog/using-claude-md-files
