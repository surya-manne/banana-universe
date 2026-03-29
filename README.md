# BananaJS

**BananaJS** is an **AI-first, domain-ready** Node.js framework on **Express**: structured routing, schema-backed validation, consistent API responses and errors, generated API docs, an optional **plugin** model, and a **`bananajs`** CLI for scaffolding, codegen, and AI-assisted workflows.

**Documentation:** [https://surya-manne.github.io/banana-universe/](https://surya-manne.github.io/banana-universe/) — [Getting started](https://surya-manne.github.io/banana-universe/guide/getting-started.html) · [Philosophy](https://surya-manne.github.io/banana-universe/guide/philosophy.html) · [Recipes](https://surya-manne.github.io/banana-universe/recipes/)

**Repository:** [github.com/surya-manne/banana-universe](https://github.com/surya-manne/banana-universe)

## Highlights

- **Productive API development** — One pattern for routes, validation, success and error payloads, and HTTP docs—less drift between teams and files.
- **Operations-ready** — Authentication, authorization, tenancy, caching, metrics, health, uploads, rate limits, and structured logging when you need them (see [Advanced concepts](https://surya-manne.github.io/banana-universe/guide/advanced-concepts.html)).
- **Composable stack** — Databases, observability, WebSocket, and more attach as plugins instead of bloating the core.
- **Domain-friendly** — Optional DDD-style layers and CLI scaffolding for bounded contexts ([Layered architecture](https://surya-manne.github.io/banana-universe/guide/layered-architecture.html)).
- **CLI & AI** — Project scaffolding (**`bananajs new`**: built-in MongoDB/SQL presets with ESLint, Prettier, Swagger at **`/api-docs`**, typed dev deps, and DB connection helpers), codegen, OpenAPI export, and AI flows for generation, documentation, and review—with optional project config for local or cloud models.

## Workspace layout

| Path                    | Role                                                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/bananajs`     | Core framework (`@banana-universe/bananajs`)                                                                                                  |
| `packages/bananajs-cli` | CLI (`bananajs`)                                                                                                                              |
| `packages/ddd`          | Domain-building primitives (`@banana-universe/ddd`)                                                                                           |
| `packages/plugin-*`     | Official plugins                                                                                                                              |
| `apps/bananajs-demo`    | Small CRUD reference                                                                                                                          |
| `apps/example-*`        | Runnable recipes (PostgreSQL, MongoDB, Fastify, WebSocket, multi-tenant) — [overview](https://surya-manne.github.io/banana-universe/recipes/) |
| `docs-site`             | Documentation site source                                                                                                                     |

## Quick install (from local Verdaccio)

After you [run Verdaccio and publish](#local-registry-verdaccio-publish-and-consume) (or use a registry URL your team shares), point npm at that registry for the scope, then install:

```ini
# e.g. in the consumer app’s .npmrc
@banana-universe:registry=http://localhost:4873/
```

```bash
npm install @banana-universe/bananajs reflect-metadata express zod
```

Peer dependencies cover optional features (OpenAPI UIs, rate limiting, uploads, metrics, and so on). See [Getting started](https://surya-manne.github.io/banana-universe/guide/getting-started.html) for TypeScript settings, a minimal app, plugins, and testing.

## Local registry (Verdaccio): publish and consume

Prerequisites: **Node.js 20+** (`engines` in root `package.json`), dependencies installed with **`npm ci`** (or `npm install`) from the repo root.

### 1. Run Verdaccio

Start the local registry and leave the process running.

```bash
npm run registry:local
```

In the terminal, Nx prints the **actual URL** (default **http://localhost:4873/**). If port **4873** is already in use, Nx picks the next free port (often **4874**) and prints `Set npm registry to http://localhost:4874/` — **use that exact host and port** for the web UI, publishing, and `.npmrc`.

- **Web UI:** open the URL from the log (e.g. [http://localhost:4873](http://localhost:4873) or [http://localhost:4874](http://localhost:4874)).
- **“No Package Published Yet”** is normal until you run a publish (step 2). The UI lists only packages published to **this** registry URL.
- **Config:** `.verdaccio/config.yml`
- **Package storage:** `tmp/local-registry/storage` (ignored by git; safe to delete to reset). Nx may clear this folder when starting the local registry.
- **Uplink:** Verdaccio proxies to **registry.npmjs.org** for packages you did not publish locally (so consumer installs can still resolve public dependencies).

### 2. Publish all workspace packages (from another terminal)

From the repository root, with Verdaccio already running (see the URL in its terminal output):

```bash
npm run publish:local
```

This runs `scripts/publish-local-verdaccio.sh`, which builds each Nx library in order and runs `npm publish` against `http://localhost:4873/` by default.

- **If Verdaccio is not on 4873** (e.g. it moved to **4874**), point the script at the same URL:

  ```bash
  NPM_PUBLISH_REGISTRY=http://localhost:4874/ npm run publish:local
  ```

- **Optional:** `npm adduser --registry http://localhost:<port>/` — only needed if your Verdaccio config requires authentication; the default local config usually allows publish without a login.

### 3. Consume `@banana-universe/*` from another project

In `~/.npmrc` or the consumer’s `.npmrc`, use the **same** host and port as Verdaccio (see `npm run registry:local` output):

```ini
@banana-universe:registry=http://localhost:4873/
```

If your registry is on **4874**, use `http://localhost:4874/` instead. Copy-paste template: `npmrc.example`.

```bash
npm install @banana-universe/bananajs@<version>
```

Use the version from each package’s `package.json` (or whatever you published).

### 4. Publish a single package manually (optional)

If you only changed one library, you can build and publish it alone—**order still matters** for dependencies (core and `ddd` before plugins; CLI last):

```bash
npx nx build <nx-project> && cd packages/<folder> && npm publish --registry http://localhost:<port>/ --access public
```

Use the same `<port>` as in step 1 (e.g. `4873` or `4874`).

| Order | Nx project                    | Folder                     |
| ----- | ----------------------------- | -------------------------- |
| 1     | `bananajs`                    | `bananajs`                 |
| 2     | `ddd`                         | `ddd`                      |
| 3–8   | `plugin-*`, `adapter-fastify` | matching `packages/*` name |
| 9     | `bananajs-cli`                | `bananajs-cli`             |

### 5. Reset the local registry (optional)

Stop Verdaccio, remove `tmp/local-registry/storage`, start `npm run registry:local` again, then re-run `npm run publish:local`.

## License

MIT — see package metadata and the docs footer.
