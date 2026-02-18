---
name: dialogue
description: Start a collaborative dialogue between agents
---

# /dialogue — Agent Dialogue

Start a collaborative dialogue between two or more agents to resolve a question or make a decision.

## Usage

`/dialogue agent1,agent2 "topic or question"`

## Behavior

1. Parse the comma-separated agent names and the quoted topic
2. Load each agent's definition from `.claude/agents/[name].md`
3. Conduct the dialogue:
   - **Agent A**: Present initial perspective on the topic
   - **Agent B**: Respond, building on Agent A's points
   - **Agent A**: Integrate perspectives, propose synthesis
   - Continue until consensus (aim for 3-5 turns)
4. If no consensus after 5 turns: escalate to Mayor or present options to user
5. Document the outcome in `.llm/memories/team_dynamics.md`

## When to Use

| Situation | Use Dialogue? |
|-----------|---------------|
| Spec needs Researcher input | Yes |
| Coder has architecture question | Yes |
| Reviewer finds issue needing discussion | Yes |
| Simple sequential task | No |

## Output Format

```
## Dialogue: [Topic]

### Participants: [Agent A], [Agent B]

**[Agent A]**: [perspective]

**[Agent B]**: [response]

**[Agent A]**: [synthesis]

### Consensus
[What was agreed upon]

### Action Items
- [What to do next]
```

## Examples

```
/dialogue spec,researcher "What auth patterns exist in this codebase?"
/dialogue coder,reviewer "Should we use a factory pattern or direct construction here?"
/dialogue planner,coder "How should we sequence the database migration?"
```
