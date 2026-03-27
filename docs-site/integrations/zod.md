# Zod

**BananaJS 0.5+** ships **Zod** as the **default** validation path: use **`@Body`**, **`@Query`**, **`@Params`**, and **`@Headers`** with a **`z.ZodType`** schema.

## Install

```bash
npm install zod
```

`zod` is a **dependency** of `@banana-universe/bananajs` — your app should list **`zod`** for direct schema imports.

## `@banana-universe/plugin-zod`

The plugin is a **deprecated shim** that re-exports **`ZodBody` → `Body`**, **`ZodQuery` → `Query`**, **`ZodParams` → `Params`** from the core package. Prefer importing from **`@banana-universe/bananajs`**.

**`ZodPlugin()`** is a no-op retained for backward compatibility.

## OpenAPI

Request body documentation is generated from Zod via **`zod-to-json-schema`** (and from explicit **`@ApiBody({ schema })`** when provided).
