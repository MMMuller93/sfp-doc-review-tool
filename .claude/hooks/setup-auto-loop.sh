#!/bin/bash
# Elite Cockpit — Auto-Loop Initialization
#
# Creates .claude/auto-loop.local.md with task config.
# Called by the /auto slash command.
#
# Usage: setup-auto-loop.sh "task description" [max_iterations] [promise]

set -e

TASK="${1:?Usage: setup-auto-loop.sh \"task\" [max_iterations] [promise]}"
MAX_ITERATIONS="${2:-20}"
PROMISE="${3:-DONE}"

# Find project root (where .claude/ lives)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

LOOP_FILE="$PROJECT_ROOT/.claude/auto-loop.local.md"

cat > "$LOOP_FILE" <<EOF
---
task: ${TASK}
max_iterations: ${MAX_ITERATIONS}
promise: ${PROMISE}
current_iteration: 1
---

# Auto-Loop: ${TASK}

**Completion Promise:** \`<promise>${PROMISE}</promise>\`

**Status:** Active

## Progress

_Updated by Witness agent as work progresses._
EOF

echo "Auto-loop initialized:"
echo "  Task: ${TASK}"
echo "  Max iterations: ${MAX_ITERATIONS}"
echo "  Promise: ${PROMISE}"
echo "  File: ${LOOP_FILE}"
