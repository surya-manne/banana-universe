# Dependency injection

BananaJS uses **tsyringe** for DI: **constructors** declare dependencies, the framework **resolves** them from **containers** tied to the app and to each **feature module**. The goal is the same as elsewhere—**thin controllers**, **testable services**, and **explicit bindings** instead of hidden singletons.

**Containers at a glance:** plugins and root **`providers`** populate the **root** container; each **`createModule`** gets a **child** container so controllers and feature services resolve **in module scope** (with access to what the root already registered).

```mermaid
flowchart TB
  subgraph root [Root container]
    RP[App-wide providers]
    PT[Tokens from plugins · e.g. DataSource]
  end
  subgraph m1 [Module A · child container]
    CA[Controller A]
    PA[Module providers]
  end
  subgraph m2 [Module B · child container]
    CB[Controller B]
    PB[Module providers]
  end
  root --> m1
  root --> m2
  PA --> CA
  PB --> CB
  style root fill:#0f2440,stroke:#fdb913,color:#f8fafc
  style m1 fill:#132a45,stroke:#5b7a8c,color:#f8fafc
  style m2 fill:#132a45,stroke:#5b7a8c,color:#f8fafc
  style CA fill:#1a3a52,stroke:#fdb913,color:#f8fafc
  style CB fill:#1a3a52,stroke:#fdb913,color:#f8fafc
```

## Containers: root and modules

- **Root container** — Holds **app-wide** registrations: things **plugins** register (shared connections, config), plus optional **`providers`** you pass through **`defineBananaAppOptions`**.
- **Per-module child container** — Each **`createModule`** slice gets its **own** container. **Controllers** and **module `providers`** resolve here first, so feature code stays **scoped** to that module.

**Plugins** should run **before** module code needs their tokens—order in the **`plugins`** array matters (see [Domain & persistence](/guide/domain-and-persistence)).

```mermaid
flowchart LR
  P1[Plugins run first] --> R[Root container ready]
  R --> M[Modules register & resolve]
  style P1 fill:#0f2440,stroke:#fdb913,color:#f8fafc
  style R fill:#132a45,stroke:#5b7a8c,color:#f8fafc
  style M fill:#1a3a52,stroke:#fdb913,color:#f8fafc
```

## Registering services

- **`createModule({ id, controller, providers })`** — List **classes** and **`{ token, useClass | useFactory | useValue }`** entries. The **controller** is registered **automatically**; **do not** add it again under **`providers`**.
- **`defineBananaAppOptions({ modules: [...], providers: [...] })`** — Use **root `providers`** for cross-cutting bindings; use **module `providers`** for **port → adapter** pairs inside a slice.

**`Injectable`**, **`inject`**, and related helpers are aligned with **tsyringe** (re-exported from core for one import surface). Layer decorators from **`@banana-universe/ddd`** compose with the same model.

## Plugins vs HTTP handlers

**`BananaPlugin.register(ctx)`** receives **`AppContext`**: Express **`app`**, optional **`logger`**, **`container`** (the **root** **tsyringe** container), and **`controllerClasses`**. Plugins use **`ctx.container`** to register **shared** infrastructure (databases, clients) used across modules.

**Controllers and services** are resolved from the **module child container** or **root** when the framework builds route handlers (**`container.resolve(Controller)`**). Prefer **constructor injection** on **`@Injectable()`** classes—there is **no** separate per-request DI context; instances are created **eagerly** at startup by default (**`lazyControllers`** defers instantiation to the first request).

## Testing

**`testOverrides`** on **`BananaAppOptions`** merges extra registrations onto the **root** container after modules—use it to **swap** implementations with **fakes** or **stubs** in integration tests (**`BananaTestApp`**).

```mermaid
flowchart LR
  subgraph prod [Production binding]
    T1[Port token]
    A1[Real adapter]
  end
  subgraph test [Tests · testOverrides]
    T2[Same token]
    F[Fake / stub]
  end
  T1 --> A1
  T2 --> F
  style T1 fill:#0f2440,stroke:#fdb913,color:#f8fafc
  style T2 fill:#0f2440,stroke:#fdb913,color:#f8fafc
  style A1 fill:#132a45,stroke:#5b7a8c,color:#f8fafc
  style F fill:#1a3a52,stroke:#fdb913,color:#f8fafc
```

## Learn more

- [Domain & persistence](/guide/domain-and-persistence) — ports, adapters, and **`{ token, useClass }`**
- [Layered architecture & DDD](/guide/layered-architecture) — **`createModule`** layout
- [BananaAppOptions](/reference/bananaapp-options) — **`providers`**, **`testOverrides`**, **`container`**
- [Advanced concepts](/guide/advanced-concepts) — modules and bootstrap
