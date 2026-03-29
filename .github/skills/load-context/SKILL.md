---
name: load-context
description: 'Load current workspace context before any task. Use at the start of every session, before planning or implementing, to understand the current implementation state, known pitfalls, and project conventions. Type /load-context to invoke.'
argument-hint: 'Optional: area to focus on (e.g. "bananajs core", "CLI", "plugins")'
---

# Load Context

## When to Use

- Start of every new session
- Before planning or implementing any feature
- When switching context between packages or features
- When unsure what has already been implemented

## Procedure

Read these files in order:

1. **[agents/IMPLEMENTATION.md](../../agents/IMPLEMENTATION.md)** — current version, module state, and last completed work *(most important)*
2. **[agents/MEMORY.md](../../agents/MEMORY.md)** — known pitfalls, preventive rules, and lessons learned
3. **[docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)** — design decisions and patterns in use
4. **[docs/TODO.md](../../docs/TODO.md)** — known issues and planned work

## Summary Format

After reading, report:

```
I have loaded context using Rosetta:
- Current version: bananajs vX.Y.Z [Phase N — status]
- Last implemented: [most recent feature from IMPLEMENTATION.md]
- Active TODOs: [count and highest priority item]
- Key pitfalls relevant to this session: [top 3 from MEMORY.md]
```

Then continue with the user's request.

## Optional Deep Context (for large tasks)

Also read when scope spans multiple packages:
- [docs/CODEMAP.md](../../docs/CODEMAP.md) — detailed file structure
- [docs/DEPENDENCIES.md](../../docs/DEPENDENCIES.md) — dependency map across packages
- [docs/PATTERNS/INDEX.md](../../docs/PATTERNS/INDEX.md) — all established coding patterns
