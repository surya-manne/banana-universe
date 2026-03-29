# **Bananajs CLI**

A command-line interface (CLI) tool to create BananaJS apps from built-in presets, generate controllers and **feature modules** that match the **`bananajs new`** layout, and run AI-assisted codegen, review, and OpenAPI tooling.

## **Table of Contents**

- Installation
- Usage (`new`, `generate`, routes, db, openapi, `ai`)
- What `bananajs new` scaffolds
- License

## **Installation**

```bash
npm install -g @banana-universe/bananajs-cli
```

Or as a dev dependency:

```bash
npm install --save-dev @banana-universe/bananajs-cli
```

Binaries: **`bananajs`** and **`bjs`**.

## **Usage**

### **`bananajs new [appName]`**

Creates a standalone app under **`./<appName>`** (MongoDB/Mongoose or SQL/TypeORM preset). Prompts for the app name if omitted (default suggestion **`my-bananajs-app`**) and for the preset in a TTY.

Skip prompts with **`bananajs new <appName> --preset mongodb`** or **`--preset sql`**. In non-interactive environments, pass **`--preset`** explicitly; if omitted, the CLI defaults to **`sql`**.

### **`bananajs generate [type] [name]`** (alias **`g`**)

**Types:** **`controller`** | **`dto`** | **`middleware`** | **`module`**

- In a **TTY**, you can run **`bjs g`** alone: the CLI prompts for **type** and **name**.
- **`module`** writes a DDD feature under **`src/modules/<feature>/`** (or **`--out`** + **`modules/<feature>/`**), aligned with **`bananajs new`**: **`createModule`** in **`index.ts`**, repository token in **`domain/`**, **`application/`** services with tsyringe, **`infrastructure/`** adapters, **`<Entity>.dto.ts`** and **`<Entity>.controller.ts`** at the module root.
- After writing files (unless **`--dry-run`** or **`--skip-bootstrap`**), the CLI **adds the module** to **`defineBananaAppOptions({ modules: [...] })`** in your bootstrap file (from **`.bananarc.json`** **`project.bootstrap`**, or **`src/bootstrap.ts`**, or auto-discovery). For **TypeORM**, it tries to append the **`OrmEntity`** class to an existing **`entities: [...]`** array under **`src/`**.
- **`--orm typeorm|mongoose|none`**, **`--preset mongodb|sql`**, **`--out`**, **`--dry-run`**, **`--skip-bootstrap`**.

### **`bananajs routes`**

Scans controllers for decorators and prints routes. **`--root <dir>`** (default **`src`**); in a TTY without **`--root`**, you are prompted.

### **`bananajs migrate`**

Express → BananaJS codemod. Confirms in a TTY.

### **`bananajs db`**

**`--status`** for TypeORM migration status. In a TTY with no flags, a short menu is shown.

### **`bananajs openapi export`**

Copies or writes OpenAPI JSON; optional **`--client typescript`**. In a TTY, optional prompts for output path and whether to generate TS types.

### **`bananajs ai`**

- **`ai setup`** — configure LLM and **`.bananarc.json`**.
- **`ai generate`** — flat files (**`--from-schema`** / **`--from-prompt`**) or DDD **`--module`**. With **no arguments** in a TTY, choose **DDD module** vs **flat** scaffold, then follow prompts (schema path vs description, ORM, optional second pass, `--dry-run`, `--skip-bootstrap`). The former **`ai wizard`** command was removed; use **`ai generate`** interactively instead.
- **`ai review`**, **`ai wire`**, **`ai test`**, **`ai explain`**, **`ai doc`** — see the [documentation site](https://surya-manne.github.io/banana-universe/tooling/cli).

Full reference: [CLI reference](https://surya-manne.github.io/banana-universe/tooling/cli) and [AI commands](https://surya-manne.github.io/banana-universe/tooling/ai-commands).

## **What `bananajs new` scaffolds**

Generated projects are **standalone** (ESLint flat config + Prettier in-repo). Typical layout:

| Area                  | Details                                                                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lint & format**     | ESLint 9 (type-aware TypeScript) + **`eslint-config-prettier`**; Prettier with **tab width 4**; **`.editorconfig`** and **`.prettierignore`**. Scripts: `npm run lint`, `npm run format`. |
| **OpenAPI / Swagger** | **`swagger.enabled: true`** in bootstrap; UI at **`/api-docs`**, JSON at **`/api-docs.json`**. **`swagger-ui-express`** in **`dependencies`**.                                            |
| **Database**          | **MongoDB:** `src/db/mongo.ts`. **SQL:** `src/db/typeorm-options.ts` and **`DATABASE_URL`**.                                                                                              |
| **Modules**           | Feature folders under **`src/modules/<feature>/`** using **`createModule`** (BananaJS v0.6+).                                                                                             |

After generation: **`cd <appName> && npm install && npm run build && npm start`**. Copy **`.env.example`** to **`.env`** and set **`DATABASE_URL`** (and **`PORT`** if needed).

## **License**

This project is licensed under the MIT License.
