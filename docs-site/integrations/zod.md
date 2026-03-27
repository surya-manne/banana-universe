# Zod (`@banana-universe/plugin-zod`)

Provides **`ZodPlugin()`** plus **`ZodBody`**, **`ZodQuery`**, and **`ZodParams`** decorators that accept any **Zod-like** schema implementing **`safeParse`**.

## Install

```bash
npm install @banana-universe/plugin-zod zod
```

## Behavior

- On **`register`**, verifies **`zod`** is installed (throws if not)
- Each decorator wraps the handler: runs **`schema.safeParse`** on `body` / `query` / `params`
- On failure — calls **`next(new BadRequestError(...))`** using **`@banana-universe/bananajs`** when available
- On success — replaces the relevant segment on `req` with parsed output and invokes the handler

## Coexistence

You can use **Zod** decorators alongside **class-validator** **`@Body`** DTOs in different controllers; pick one style per route.

## Plugin stub

**`ZodPlugin()`** currently performs the **`zod`** availability check at startup. Validation is implemented in the **`ZodBody` / `ZodQuery` / `ZodParams`** decorators.
