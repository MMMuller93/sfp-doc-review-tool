# Interview Skill (by Danny)

> "This is single-handedly the best Claude Skill someone ever shared."

## What It Does

Uses Claude's `AskUserQuestion` tool to deeply interview you about every detail of a task — technical implementation, UI/UX, concerns, tradeoffs, etc. The output is a super detailed spec file you can then use to create tasks with.

## Recommended Workflow

```
/interview -> Plan Mode with spec file -> Implement with Ralph
```

## Skill Prompt

```yaml
---
argument-hint: [instructions]
description: Interview user in-depth to create a detailed spec
allowed-tools: AskUserQuestion, Write
---
```

```
Follow the user instructions and interview me in detail using the AskUserQuestionTool about literally anything: technical implementation, UI & UX, concerns, tradeoffs, etc. but make sure the questions are not obvious. be very in-depth and continue interviewing me continually until it's complete. then, write the spec to a file. <instructions>$ARGUMENTS</instructions>
```

## How to Install

Save the skill prompt above as a file at:

```
.claude/commands/interview.md
```

The file should contain the full prompt including the YAML frontmatter and the instruction body.

## Key Details

- **Allowed Tools**: Only `AskUserQuestion` and `Write` — keeps it focused on interviewing and spec output
- **`$ARGUMENTS`**: Whatever you pass after `/interview` becomes the instructions context
- **Output**: A detailed spec file written to disk once the interview is complete
