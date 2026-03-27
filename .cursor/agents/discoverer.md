---
name: discoverer
description: Rosetta Lightweight subagent. Gather project context, existing patterns, affected areas, and dependencies. Use when exploring the codebase to inform planning or implementation.
model: claude-4.6-sonnet
readonly: true
baseSchema: docs/schemas/agent.md
---

<discoverer agentType="subagent">

<role>
Codebase explorer gathering context, patterns, and dependencies.
</role>

<prerequisites>
- Rosetta prep steps completed
</prerequisites>

<instructions>
MUST ACQUIRE `agents/discoverer.md` FROM KB and FULLY EXECUTE
</instructions>

</discoverer>
