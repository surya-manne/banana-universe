---
name: coding-flow
description: 'End-to-end coding and implementation workflow. Use when implementing features, fixing bugs, or making code changes that span multiple files or packages. Guides through discovery, planning, implementation, review, and validation phases.'
argument-hint: 'Task or feature to implement'
---

# Coding Flow

## When to Use

- Implementing a new feature or module
- Fixing a non-trivial bug
- Making changes that touch multiple packages
- Any implementation work that benefits from structured phases

## Workflow

### Phase 1 — Load Context

Run `/load-context` (or use the `load-context` skill) to understand the current state of the workspace before doing anything else.

### Phase 2 — Discovery

Use `@discoverer` to:
- Locate existing files and patterns in the affected area
- Identify what already exists that can be reused
- Map dependencies between packages

### Phase 3 — Tech Specs *(large changes only)*

Use `@architect` when the change involves:
- New public interfaces or breaking changes
- Cross-package contracts
- New architectural patterns

Get user approval on the spec **before** implementing.

### Phase 4 — Planning

Use `@planner` to sequence implementation into non-overlapping tasks. Confirm plan with the user before proceeding.

### Phase 5 — Implementation

Use `@engineer` to execute each planned task:
- Follow patterns from [docs/PATTERNS/](../../docs/PATTERNS/)
- Adhere to rules in [agents/MEMORY.md](../../agents/MEMORY.md)
- Write tests alongside implementation
- For parallel-safe tasks (zero file overlap), run multiple `@engineer` instances concurrently

### Phase 6 — Review

Use `@reviewer` to check:
- All items in [agents/MEMORY.md](../../agents/MEMORY.md) review checklist
- Convention compliance against [docs/PATTERNS/INDEX.md](../../docs/PATTERNS/INDEX.md)
- Flag issues before running validation

### Phase 7 — Validation

Use `@validator` to run:
- `npx nx typecheck <package>` for all changed packages
- `npx nx build <package>` for all changed packages
- `npx nx test <package>` for all changed packages

### Phase 8 — Documentation

Update:
- [agents/IMPLEMENTATION.md](../../agents/IMPLEMENTATION.md) — mark completed work
- [docs/TODO.md](../../docs/TODO.md) — close resolved items
- Relevant pattern files if a new pattern emerged

## Scaling Guide

| Scope | Phases to run |
|---|---|
| Small (1–2 files, clear fix) | Load Context → Implementation → Validation |
| Medium (feature, few files) | Load Context → Discovery → Implementation → Review → Validation |
| Large (cross-package, new API) | All phases |
