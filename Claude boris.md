# CLAUDE.md

## Workflow

- Plan before coding. Use Plan Mode for multi-file changes. Do not start implementation until the plan is confirmed.
- If implementation goes wrong, stop and re-plan. Do not push through a broken approach.
- After 2 failed corrections, start fresh with a better prompt instead of continuing in polluted context.
- Verify every change: run tests, lint, typecheck. Do not ship unverified code.
- Use subagents for codebase exploration and research to keep the main context clean.
- Use extended thinking ("think hard", "ultrathink") for complex architectural decisions.
- Scope each session to one task. Use `/clear` between unrelated tasks.

## Code style

- Use ES modules (import/export), not CommonJS (require).
- Destructure imports when possible.
- Prefer early returns over nested ifs.
- Use named exports.

## Commands

- `pnpm test --filter <name>`: run focused test
- `pnpm lint`: lint before pushing
- `pnpm typecheck`: typecheck after code changes
- `gh pr create`: create pull request

## Git

- Write descriptive commit messages based on the diff and surrounding context.
- Commit tests separately from implementation when doing TDD.
- Use `gh` CLI for all GitHub interactions (issues, PRs, comments).

## Testing

- Write tests first for non-trivial changes (TDD).
- Cover edge cases and error conditions.
- Run focused tests, not the whole suite, for performance.
- Do not modify tests when writing implementation to pass them.

## Documentation

- Update CLAUDE.md when correcting a recurring mistake.
- Update README and changelogs when shipping user-facing changes.
- Update docs when behavior changes.

## Context management

- Do not read files unnecessarily. Let tools like Grep and Glob find what you need.
- Delegate research and exploration to subagents.
- When compacting, preserve the full list of modified files and any test commands.
- For large tasks, write a checklist to a markdown file and work through it item by item.

## Hooks (enforced automatically)

- PostToolUse (Edit|Write): auto-format with `npm run format`
- Stop: verify all tasks are complete, tests pass, and code is formatted before stopping.

## Permissions

- Pre-allowed: Edit, Write, Bash(git commit:*), Bash(pnpm test:*), Bash(pnpm lint:*), Bash(gh:*)
- All other bash commands require approval.
