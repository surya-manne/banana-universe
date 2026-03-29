# Philosophy

BananaJS is built for teams who want **serious structure** without **enterprise bloat**. Four ideas drive the product:

**Where it sits:** a thin layer on **Express**—same Node deployment, shared patterns (decorators, errors, modules) so the team and tooling see one shape.

```mermaid
flowchart LR
  subgraph client [Clients]
    U[Browser / app / service]
  end
  subgraph bjs [BananaJS]
    D[Decorators and routes]
    V[Validation and types]
    E[Consistent success and errors]
  end
  subgraph ex [Express]
    X[HTTP pipeline]
  end
  subgraph you [Your code]
    M[Modules and domain]
  end
  U --> D
  D --> V
  V --> E
  E --> X
  X --> M
  style D fill:#0f2440,stroke:#fdb913,color:#f8fafc
  style V fill:#132a45,stroke:#5b7a8c,color:#f8fafc
  style E fill:#132a45,stroke:#5b7a8c,color:#f8fafc
  style X fill:#1a3a52,stroke:#fdb913,color:#f8fafc
  style M fill:#0f2440,stroke:#5b7a8c,color:#f8fafc
```

## AI-first

Developer productivity is not optional. The **`bjs`** CLI ships **AI-assisted** flows: generate from **OpenAPI / JSON Schema** or **natural language**, **structured review**, **wire** hints, **test** scaffolds, **`explain`**, and (on a deprecation path) **JSDoc** via **`ai doc`**. **`bjs ai setup`** writes **`.bananarc.json`**; the **`llm/`** provider layer supports **Ollama** (default), **llama.cpp**, **OpenAI**, and **Anthropic**. **`bjs ai generate --module`** produces **layered** domain, application, and infrastructure folders from a description or schema. Full index: **[AI hub](/ai/)**.

## Developer experience (DX)

**Decorators** match how you already think about HTTP. **Validation** is declarative. **Responses and errors** are typed and consistent. **OpenAPI** is generated from the same decorators you ship. **Plugins** register with a clear lifecycle; **`BananaApp.create`** handles async setup. **Testing** gets a first-class **`BananaTestApp`** path. The goal is flow: less ceremony, fewer foot-guns, faster iteration—without hiding complexity when you need control.

```mermaid
sequenceDiagram
  participant C as Caller
  participant R as Route + schema
  participant H as Your handler
  participant S as Typed response
  C->>R: HTTP request
  R->>R: Validate input
  alt invalid
    R-->>C: Clear error shape
  else valid
    R->>H: Run business code
    H->>S: Success or typed error
    S-->>C: Consistent JSON
  end
```

## Extendable by design

The core stays lean; **everything heavy is optional**. **Official plugins** (TypeORM, Mongoose, OpenTelemetry, Zod, WebSocket) implement the same **`BananaPlugin`** contract as your own code. **Auth, ABAC, tenancy, caching, metrics, uploads, rate limits**—pluggable interfaces, not locked-in implementations. You extend the framework; it does not trap you in a single database or cloud story.

```mermaid
flowchart TB
  subgraph core [Core]
    C[Routing · validation · errors · app lifecycle]
  end
  subgraph opt [Optional]
    O1[ORM / Mongo]
    O2[Observability]
    O3[Auth & ABAC]
    O4[WebSockets]
  end
  core --> opt
  style core fill:#0f2440,stroke:#fdb913,color:#f8fafc
  style O1 fill:#132a45,stroke:#5b7a8c,color:#f8fafc
  style O2 fill:#132a45,stroke:#5b7a8c,color:#f8fafc
  style O3 fill:#132a45,stroke:#5b7a8c,color:#f8fafc
  style O4 fill:#132a45,stroke:#5b7a8c,color:#f8fafc
```

## Domain-driven design

**Structure can grow with the problem** — start simple, then introduce **clear boundaries** between **domain rules**, **use cases**, and **infrastructure** when the model deserves it. Nothing about BananaJS requires a heavy ceremony up front.

```mermaid
flowchart TB
  subgraph edge [HTTP edge]
    H[Thin controllers]
  end
  subgraph mid [Application]
    A[Use cases]
  end
  subgraph deep [Domain & infra]
    D[Rules and ports]
    I[Adapters]
  end
  H --> A
  A --> D
  D --> I
  style H fill:#0f2440,stroke:#fdb913,color:#f8fafc
  style A fill:#132a45,stroke:#5b7a8c,color:#f8fafc
  style D fill:#132a45,stroke:#5b7a8c,color:#f8fafc
  style I fill:#1a3a52,stroke:#fdb913,color:#f8fafc
```

**Optional depth** — A dedicated **DDD toolkit** and **layered module** scaffolding exist for teams that want **shared vocabulary** (entities, repositories, units of work) and **consistent folders**; you can adopt as much or as little as fits your codebase.

**Edges, not leaks** — **Databases and integrations** stay behind **ports and adapters**; HTTP stays thin. Deeper dive: [Domain & persistence](/guide/domain-and-persistence). Layouts and CLI: [Layered architecture](/guide/layered-architecture), [AI module generation](/tooling/ai-module-generation).

---

The stack covers security, multi-tenancy, plugins, observability, and AI-assisted CLI workflows, with **schema-driven** request validation. **[Recipes](/recipes/)** in the repository walk through PostgreSQL, MongoDB, Fastify, WebSocket, and multi-tenant setups end-to-end.
