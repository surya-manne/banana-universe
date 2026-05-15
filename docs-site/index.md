---
layout: home

hero:
  name: BananaJS
  text: AI-first, DDD-ready Node.js framework for high-velocity teams
  tagline: DX · Decorators · Express · Plugins · AI-native CLI
  image:
    src: /banana-hero.svg
    alt: BananaJS — Express, plugins, CLI, AI
  actions:
    - theme: brand
      text: Quickstart — 5 min
      link: /guide/quickstart
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Recipes
      link: /recipes/

features:
  - icon: 🤖
    title: AI-first CLI & codegen
    details: 'Turn specs and prompts into working endpoints and modules—generate code, improve docs, and review quality from the CLI so routine API work does not eat your week.'
    link: /ai/
    linkText: AI docs
  - icon: ✨
    title: DX — calm and productive
    details: 'Developer experience matters—one consistent way to declare routes, validate input, shape responses, and surface errors: less boilerplate, fewer surprises, faster iteration on real product logic.'
    link: /guide/basic-concepts
    linkText: Core concepts
  - icon: 🧱
    title: DDD as a destination
    details: 'Keep business rules and use cases understandable and testable—structure grows with your product instead of turning into a flat pile of handlers.'
    link: /guide/layered-architecture
    linkText: Architecture guide
  - icon: 🔌
    title: Deeply extendable
    details: 'Add databases, realtime, observability, and other integrations when you need them—the core stays lean while you opt into heavier pieces.'
    link: /plugins/overview
    linkText: Plugin docs
  - icon: 🧩
    title: MCP server
    details: '`bjs mcp start` exposes the full BananaJS CLI as a Model Context Protocol server—9 typed tools available natively in Cursor, Claude Desktop, and any MCP-compatible IDE. No copy-pasting terminal commands, no context switching.'
    link: /mcp/
    linkText: MCP docs
  - icon: 📄
    title: Automatic Swagger docs
    details: 'Your decorators are the spec. The OpenAPI doc your consumers read is built live from the same code your server runs—so the contract never drifts, and you never write YAML.'
    link: /reference/openapi
    linkText: OpenAPI docs
---

<div class="sky-scene" aria-hidden="true">
  <span class="sky-orb sky-orb-1"></span>
  <span class="sky-orb sky-orb-2"></span>
  <span class="sky-orb sky-orb-3"></span>
</div>

<div class="home-hero-section">

<p class="tagline-rich">
  <span class="gradient-text">Exceptional DX on Express</span> — structure and automation for teams that want <strong>clear APIs</strong> and a path to <strong>domain-driven design</strong>, with a CLI that fits how modern teams work — without dragging in a heavyweight runtime.
</p>

</div>

<div class="home-why">

<h2>Why BananaJS</h2>
<p class="home-why-sub">A deliberate stack. Not a thin wrapper.</p>

<p><strong>Not a thin wrapper around Express</strong> — a deliberate stack for teams who want <strong>great DX</strong>, <strong>structure</strong>, <strong>automation</strong>, and <strong>maintainable domains</strong> without adopting a monolithic platform. Invest in <strong>tooling</strong> so you spend time on product behavior, not repetitive files. <strong>Plugins</strong> let capabilities grow without bloating the core.</p>

<p><strong>If you've shipped on Express and want NestJS-style structure without leaving the runtime, you're the target user.</strong></p>

<p><a href="/guide/philosophy">Philosophy</a> · <a href="/guide/layered-architecture">Layered architecture</a> · <a href="/recipes/">Recipes</a></p>

</div>

<div class="home-showcase">
<div class="home-showcase-eyebrow">End-to-end walkthrough</div>
<h2 class="home-showcase-title">Building a Jira-style issue tracker</h2>
<p class="home-showcase-sub">Six phases — LLM setup to a reviewed, tested, production-ready module. Every command is real and runs today.</p>
<div class="hs-phase-list"><div class="hs-phase hs-phase-1"><div class="hs-phase-meta">
<div class="hs-phase-hd"><span class="hs-num hs-c1">01</span><span class="hs-tag hs-tag-1">bjs ai setup</span></div>
<strong class="hs-ptitle">Connect your LLM. One time.</strong>
<p class="hs-pdesc">Run once at project root. The wizard writes <code>.bananarc.json</code> — every subsequent <code>bjs ai</code> command reads it automatically. No flags to repeat, no env vars to juggle between sessions.</p>
<ul class="hs-pts">
<li>OpenAI, Anthropic, or Gemini — your choice</li>
<li>Default ORM and output directory stored</li>
<li>API key auto-added to .gitignore — never commits</li>
</ul>
<a class="hs-cta" href="/tooling/ai-commands">AI commands →</a>
</div><div class="hs-phase-code">
<div class="hs-tabs">
<input type="radio" id="hsp1t1" name="hsp1" checked><input type="radio" id="hsp1t2" name="hsp1">
<div class="hs-tb"><label for="hsp1t1" class="hs-tl">Interactive wizard</label><label for="hsp1t2" class="hs-tl">.bananarc.json output</label></div>
<div class="hs-tp"><div class="hs-tc">

```bash
$ bjs ai setup           # one-time per project

  ? LLM provider  ›  Anthropic
  ? Model         ›  claude-3-5-sonnet-20241022
  ? API key       ›  sk-ant-••••••••••••••••••••

  ✔  Written .bananarc.json
  ✔  Added to .gitignore

  All bjs ai commands now read this config automatically.
  Run  bjs ai generate  to scaffold your first module.
```

</div><div class="hs-tc">

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "apiKey": "sk-ant-••••••••••••••••••••"
  },
  "generate": {
    "outDir": "src",
    "orm": "mongoose"
  }
}
```

</div></div></div></div></div>
<div class="hs-phase hs-phase-2"><div class="hs-phase-meta">
<div class="hs-phase-hd"><span class="hs-num hs-c2">02</span><span class="hs-tag hs-tag-2">bjs ai generate --module</span></div>
<strong class="hs-ptitle">Three ways to scaffold. Same layered output.</strong>
<p class="hs-pdesc">Plain English → <code>--module</code>. Existing spec → <code>--from-schema</code>. Preview without writing → <code>--dry-run</code>. All three produce the same <code>domain/ · application/ · infrastructure/</code> layout.</p>
<ul class="hs-pts">
<li>--module: describe in plain English (most flexible)</li>
<li>--from-schema: deterministic from JSON Schema / OpenAPI</li>
<li>--dry-run: review file list before anything is written</li>
</ul>
<a class="hs-cta" href="/ai/">AI codegen docs →</a>
</div><div class="hs-phase-code">
<div class="hs-tabs">
<input type="radio" id="hsp2t1" name="hsp2" checked><input type="radio" id="hsp2t2" name="hsp2"><input type="radio" id="hsp2t3" name="hsp2">
<div class="hs-tb"><label for="hsp2t1" class="hs-tl">--module (plain English)</label><label for="hsp2t2" class="hs-tl">--from-schema</label><label for="hsp2t3" class="hs-tl">--dry-run preview</label></div>
<div class="hs-tp"><div class="hs-tc">

```bash
$ bjs ai generate --module \
    "Issues: title, description, status (open/in-progress/done),
     priority (low/medium/high/critical), assignee, project" \
    --orm mongoose

  ✔  Analyzing requirements...
  ✔  Planning module...
  ✔  Writing 8 files...

  src/modules/issue/
    domain/
      Issue.entity.ts                 ← entity + value types
      Issue.repository.ts             ← port interface + token
    application/
      Issue.service.ts                ← application service
    infrastructure/
      Issue.mongoose-model.ts         ← Mongoose schema
      Issue.mongoose-repository.ts    ← adapter (implements port)
    Issue.dto.ts                      ← Zod validation schemas
    Issue.controller.ts               ← @Controller + routes
    index.ts                          ← createModule() DI wiring

  ✔  issueModule registered in bootstrap.ts
```

</div><div class="hs-tc">

```bash
# Generate from an existing JSON Schema or OpenAPI file
$ bjs ai generate --from-schema ./docs/issue-openapi.json

  ✔  Loading JSON Schema...
  ✔  Extracting shapes from 3 schemas...
  ✔  Writing flat files...

  src/
    IssueController.ts    ← GET / POST / PUT / DELETE routes
    issue.dto.ts          ← Zod schemas derived from the spec
    IssueService.ts       ← application service stub

  Tip: add --module to produce a DDD-layered module instead
       of a flat controller + service output.
```

</div><div class="hs-tc">

```bash
# Preview which files would be created — nothing touches disk
$ bjs ai generate --module "Issues tracker" \
    --orm mongoose --dry-run

  ✔  Planning module...
  [dry-run] would write:
    src/modules/issue/domain/Issue.entity.ts
    src/modules/issue/domain/Issue.repository.ts
    src/modules/issue/application/Issue.service.ts
    src/modules/issue/infrastructure/Issue.mongoose-model.ts
    src/modules/issue/infrastructure/Issue.mongoose-repository.ts
    src/modules/issue/Issue.dto.ts
    src/modules/issue/Issue.controller.ts
    src/modules/issue/index.ts

  Nothing written. Remove --dry-run to generate.
```

</div></div></div></div></div>
<div class="hs-phase hs-phase-3"><div class="hs-phase-meta">
<div class="hs-phase-hd"><span class="hs-num hs-c3">03</span><span class="hs-tag hs-tag-3">Controller · DTOs · Validation</span></div>
<strong class="hs-ptitle">Routes declared. Bad input rejected before your code runs.</strong>
<p class="hs-pdesc">Zod schemas in <code>Issue.dto.ts</code> are the single source of shape rules. Attach one as a decorator and invalid payloads return a structured 400 automatically — your handler never sees bad data.</p>
<ul class="hs-pts">
<li>DTOs: Zod schemas, fully type-inferred — zero duplication</li>
<li>@Body() / @Params(): automatic 400 if schema fails</li>
<li>Controller: HTTP concerns only, zero business logic</li>
</ul>
<a class="hs-cta" href="/guide/validation">Validation docs →</a>
</div><div class="hs-phase-code">
<div class="hs-tabs">
<input type="radio" id="hsp3t1" name="hsp3" checked><input type="radio" id="hsp3t2" name="hsp3"><input type="radio" id="hsp3t3" name="hsp3">
<div class="hs-tb"><label for="hsp3t1" class="hs-tl">DTOs · Zod schemas</label><label for="hsp3t2" class="hs-tl">Controller</label><label for="hsp3t3" class="hs-tl">400 error response</label></div>
<div class="hs-tp"><div class="hs-tc">

```typescript
// Issue.dto.ts — generated schemas (edit freely)
import { z } from 'zod'

export const CreateIssueSchema = z.object({
  title:      z.string().min(1).max(200),
  projectId:  z.string().min(1),
  priority:   z.enum(['low', 'medium', 'high', 'critical']),
  assigneeId: z.string().optional(),
})

export const UpdateIssueSchema = CreateIssueSchema
  .partial()
  .extend({ status: z.enum(['open', 'in-progress', 'done']).optional() })

// Types are fully inferred — no separate interface needed
export type CreateIssueDto = z.infer<typeof CreateIssueSchema>
export type UpdateIssueDto = z.infer<typeof UpdateIssueSchema>
```

</div><div class="hs-tc">

```typescript
// Issue.controller.ts — HTTP layer only
@injectable()
@Controller('issues')
export class IssueController extends BaseController {
  constructor(
    @inject(IssueAppService)
    private readonly app: IssueAppService,
  ) { super() }

  @Post('')
  @Body(CreateIssueSchema)            // 400 on schema failure — automatic
  async create(req: Request, res: Response) {
    return this.ok(res, 'created', await this.app.create(req.body))
  }

  @Put(':id')
  @Params(z.object({ id: z.string().min(1) }))
  @Body(UpdateIssueSchema)
  async update(req: Request, res: Response) {
    return this.ok(res, 'ok', await this.app.update(req.params.id, req.body))
  }

  @Get('')
  @Query(z.object({ projectId: z.string().min(1) }))
  async list(req: Request, res: Response) {
    return this.ok(res, 'ok', await this.app.findByProject(req.query.projectId as string))
  }
}
```

</div><div class="hs-tc">

```bash
# POST /issues  { "title": "" }
# HTTP 400 Bad Request — handler was never called

{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "String must contain at least 1 character(s)"
    },
    {
      "field": "projectId",
      "message": "Required"
    },
    {
      "field": "priority",
      "message": "Invalid enum value. Expected low | medium | high | critical"
    }
  ]
}
```

</div></div></div></div></div>
<div class="hs-phase hs-phase-4"><div class="hs-phase-meta">
<div class="hs-phase-hd"><span class="hs-num hs-c4">04</span><span class="hs-tag hs-tag-4">Service · Repository · MongoDB</span></div>
<strong class="hs-ptitle">Logic isolated. Persistence swappable.</strong>
<p class="hs-pdesc">The application service holds all business rules, injected by tsyringe. It depends only on the repository port interface — Mongoose never leaks into logic. The adapter in <code>infrastructure/</code> can be swapped without touching a single rule.</p>
<ul class="hs-pts">
<li>App service: @injectable(), constructor-injected port</li>
<li>Domain port: pure TS interface + Symbol token in domain/</li>
<li>Mongoose adapter: implements port, isolated in infrastructure/</li>
</ul>
<a class="hs-cta" href="/guide/dependency-injection">DI guide →</a>
</div><div class="hs-phase-code">
<div class="hs-tabs">
<input type="radio" id="hsp4t1" name="hsp4" checked><input type="radio" id="hsp4t2" name="hsp4"><input type="radio" id="hsp4t3" name="hsp4"><input type="radio" id="hsp4t4" name="hsp4">
<div class="hs-tb"><label for="hsp4t1" class="hs-tl">Application service</label><label for="hsp4t2" class="hs-tl">Domain port</label><label for="hsp4t3" class="hs-tl">Mongoose adapter</label><label for="hsp4t4" class="hs-tl">index.ts · wiring</label></div>
<div class="hs-tp"><div class="hs-tc">

```typescript
// application/Issue.service.ts
@injectable()
export class IssueAppService {
  constructor(
    @inject(IssueRepositoryToken)
    private readonly repo: IssueRepository,   // port, not Mongoose
  ) {}

  async create(dto: CreateIssueDto): Promise<Issue> {
    const issue = this.repo.create({ ...dto, status: 'open' })
    return this.repo.save(issue)
  }

  async update(id: string, dto: UpdateIssueDto): Promise<Issue> {
    const issue = await this.repo.findById(id)
    if (!issue) throw new NotFoundError('Issue', id)
    issue.update(dto)             // domain rule lives in the entity
    return this.repo.save(issue)
  }

  async findByProject(projectId: string): Promise<Issue[]> {
    return this.repo.findByProject(projectId)
  }
}
```

</div><div class="hs-tc">

```typescript
// domain/Issue.repository.ts — ORM-agnostic interface (port)
export interface IssueRepository {
  save(issue: Issue): Promise<Issue>
  findById(id: string): Promise<Issue | null>
  findByProject(projectId: string): Promise<Issue[]>
}

// Symbol token — used by tsyringe for DI
export const IssueRepositoryToken = Symbol('IssueRepository')

// Wired once in index.ts → createModule({
//   providers: [
//     { token: IssueRepositoryToken,
//       useClass: IssueMongooseRepository },  ← swap freely
//   ]
// })
// The service never changes when you swap adapters.
```

</div><div class="hs-tc">

```typescript
// infrastructure/Issue.mongoose-repository.ts
@injectable()
export class IssueMongooseRepository implements IssueRepository {
  async save(issue: Issue): Promise<Issue> {
    await IssueModel.findOneAndUpdate(
      { _id: issue.id },
      toDocument(issue),
      { upsert: true },
    )
    return issue
  }

  async findById(id: string): Promise<Issue | null> {
    const doc = await IssueModel.findById(id).lean()
    return doc ? toDomain(doc) : null
  }

  async findByProject(projectId: string): Promise<Issue[]> {
    const docs = await IssueModel
      .find({ projectId })
      .sort({ createdAt: -1 })
      .lean()
    return docs.map(toDomain)
  }
}
```

</div><div class="hs-tc">

```typescript
// src/modules/issue/index.ts — generated DI wiring
import { createModule } from '@banana-universe/bananajs'
import { IssueController } from './Issue.controller.js'
import { IssueAppService } from './application/Issue.service.js'
import { IssueRepositoryToken } from './domain/Issue.repository.js'
import { IssueMongooseRepository } from './infrastructure/Issue.mongoose-repository.js'

export const issueModule = createModule({
  id: 'issue',
  controller: IssueController,
  providers: [
    IssueAppService,
    {
      token: IssueRepositoryToken,
      useClass: IssueMongooseRepository,   // ← swap for any adapter
    },
  ],
})

// Register in bootstrap.ts:
import { BananaApp } from '@banana-universe/bananajs'
import { mongoosePlugin } from '@banana-universe/plugin-mongoose'

const app = await BananaApp.create({
  plugins: [mongoosePlugin({ uri: process.env.MONGO_URI! })],
  modules: [issueModule],   // ← add more modules here
})
app.listen(3000)
```

</div></div></div></div></div>
<div class="hs-phase hs-phase-5"><div class="hs-phase-meta">
<div class="hs-phase-hd"><span class="hs-num hs-c5">05</span><span class="hs-tag hs-tag-5">bjs ai doc · openapi enrich</span></div>
<strong class="hs-ptitle">Docs generated. Spec enriched. Zero drift.</strong>
<p class="hs-pdesc"><code>bjs ai doc</code> reads your controller and writes JSDoc for every route. <code>bjs ai openapi enrich</code> reads the exported spec and adds descriptions, request examples, and error schemas derived from the same live decorators — the contract never drifts.</p>
<ul class="hs-pts">
<li>bjs ai doc: JSDoc on every route in one pass</li>
<li>openapi enrich: descriptions + examples + 40x schemas</li>
<li>Spec always matches running code — no YAML to hand-write</li>
</ul>
<a class="hs-cta" href="/reference/openapi">OpenAPI docs →</a>
</div><div class="hs-phase-code">
<div class="hs-tabs">
<input type="radio" id="hsp5t1" name="hsp5" checked><input type="radio" id="hsp5t2" name="hsp5">
<div class="hs-tb"><label for="hsp5t1" class="hs-tl">bjs ai doc</label><label for="hsp5t2" class="hs-tl">bjs ai openapi enrich</label></div>
<div class="hs-tp"><div class="hs-tc">

```bash
$ bjs ai doc --file src/modules/issue/Issue.controller.ts

  ✔  Reading Issue.controller.ts...
  ✔  Generating JSDoc for 3 routes...
  ✔  Written — 3 descriptions added

# Generated JSDoc (sample):
  /**
   * Create a new issue in the specified project.
   * @route   POST /issues
   * @body    {CreateIssueDto} Issue creation payload
   * @returns {Issue}            201 - Created issue object
   * @returns {ValidationError}  400 - Schema validation failed
   */
  async create(req: Request, res: Response) { ... }
```

</div><div class="hs-tc">

```bash
$ bjs ai openapi enrich

  ✔  Loading openapi.json (12 endpoints)...
  ✔  Enriching /issues endpoints (3 routes)...
  ✔  Added summaries and descriptions to 3 routes
  ✔  Added request body examples to 2 routes
  ✔  Added 400, 404, 422 response schemas to 3 routes
  ✔  Written docs/openapi.json

# Before:  "summary": ""
# After:   "summary": "Create a new issue",
#          "description": "Creates an issue in the given project.",
#          "requestBody": {
#            "example": { "title": "Fix login bug", "priority": "high" }
#          }
```

</div></div></div></div></div>
<div class="hs-phase hs-phase-6"><div class="hs-phase-meta">
<div class="hs-phase-hd"><span class="hs-num hs-c6">06</span><span class="hs-tag hs-tag-6">bjs ai review · test · perf</span></div>
<strong class="hs-ptitle">Review it. Test it. Ship it.</strong>
<p class="hs-pdesc">Three AI checks before a PR. <code>bjs ai review</code> catches missing guards with file+line references. <code>bjs ai test</code> scaffolds a Supertest file matched to your actual routes. <code>bjs ai perf</code> scans for N+1 patterns and missing indexes.</p>
<ul class="hs-pts">
<li>review: security, logic, patterns — with file + line refs</li>
<li>test: Supertest scaffold matched to your actual routes</li>
<li>perf: query efficiency + missing DB index coverage</li>
</ul>
<a class="hs-cta" href="/tooling/ai-commands">All AI commands →</a>
</div><div class="hs-phase-code">
<div class="hs-tabs">
<input type="radio" id="hsp6t1" name="hsp6" checked><input type="radio" id="hsp6t2" name="hsp6"><input type="radio" id="hsp6t3" name="hsp6">
<div class="hs-tb"><label for="hsp6t1" class="hs-tl">bjs ai review</label><label for="hsp6t2" class="hs-tl">bjs ai test</label><label for="hsp6t3" class="hs-tl">bjs ai perf</label></div>
<div class="hs-tp"><div class="hs-tc">

```bash
$ bjs ai review --module src/modules/issue

  ✔  Scanning 5 files in src/modules/issue...

  ⚠  Issue.controller.ts:8   No @Auth() guard — all routes are public.
                             Add @Auth() at the controller class level.
  ⚠  Issue.controller.ts:32  GET /issues has no pagination — add
                             limit/offset or cursor query params.
  ✔  Issue.entity.ts         Domain model clean, no ORM leakage
  ✔  Issue.repository.ts     Port correctly typed and isolated
  ✔  index.ts                DI wiring matches repository token

  2 warnings · 0 errors · 3 passing
```

</div><div class="hs-tc">

```typescript
// bjs ai test → writes src/__tests__/issue.test.ts
import { BananaTestApp } from '@banana-universe/bananajs/testing'
import { issueModule } from '../modules/issue/index.js'
import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'
import request from 'supertest'

describe('IssueController', () => {
  let app: BananaTestApp

  before(async () => {
    app = await BananaTestApp.create({ modules: [issueModule] })
  })
  after(() => app.close())

  it('POST /issues returns 201', async () => {
    const res = await request(app.server)
      .post('/issues')
      .send({ title: 'Fix login bug', projectId: 'p1', priority: 'high' })
    assert.equal(res.status, 201)
  })

  it('POST /issues returns 400 on bad payload', async () => {
    const res = await request(app.server)
      .post('/issues').send({ title: '' })
    assert.equal(res.status, 400)
  })
})
```

</div><div class="hs-tc">

```bash
$ bjs ai perf --file src/modules/issue/Issue.service.ts

  ✔  Analyzing Issue.service.ts...

  ⚠  findByProject (line 24): result set unbounded
     — add .limit() or pagination to the Mongoose query
  ⚠  Issue.mongoose-model.ts: no index for { projectId }
     — add: IssueSchema.index({ projectId: 1, createdAt: -1 })

  ✔  No synchronous blocking operations detected
  ✔  No N+1 query patterns found in service methods

  2 warnings · 0 errors
```

</div></div></div></div></div></div></div>

<div class="home-fw">
<div class="home-fw-eyebrow">Built-in decorators</div>
<h2 class="home-fw-title">Framework capabilities</h2>
<p class="home-fw-sub">Every decorator below ships in <code>@banana-universe/bananajs</code> — no extra packages, no configuration files.</p>
<div class="home-fw-showcase">
<div class="home-fw-tabs hs-tabs">
<input type="radio" id="hpfw1" name="hpfw" checked><input type="radio" id="hpfw2" name="hpfw"><input type="radio" id="hpfw3" name="hpfw"><input type="radio" id="hpfw4" name="hpfw"><input type="radio" id="hpfw5" name="hpfw"><input type="radio" id="hpfw6" name="hpfw">
<div class="home-fw-tb"><label for="hpfw1" class="home-fw-tl">🔐 Auth</label><label for="hpfw2" class="home-fw-tl">🛡️ ABAC</label><label for="hpfw3" class="home-fw-tl">🏢 Multi-tenancy</label><label for="hpfw4" class="home-fw-tl">⚡ Caching</label><label for="hpfw5" class="home-fw-tl">🚦 Throttle</label><label for="hpfw6" class="home-fw-tl">🧹 Sanitize</label></div>
<div class="home-fw-tp"><div class="home-fw-tc"><div class="home-fw-panel-meta">
<strong class="home-fw-panel-title">Auth · Roles · Public</strong>
<p class="home-fw-panel-desc">Plug in any guard via <code>AuthGuard</code>. Lock a whole controller with one decorator, open individual routes with <code>@Public()</code>, and restrict by role string.</p>
<ul class="home-fw-panel-pts">
<li>One <code>@Auth()</code> on the class secures all routes</li>
<li><code>@Public()</code> carves out opt-out exceptions</li>
<li><code>@Roles('admin')</code> adds role checks on top of auth</li>
</ul>
<a class="hs-cta" href="/guide/auth">Auth docs →</a>
</div><div class="home-fw-panel-code">

```typescript
@Auth()                         // all routes require auth
@Controller('issues')
export class IssueController extends BaseController {

  @Get('')                      // inherits @Auth()
  async list(req, res) { ... }

  @Public()                     // opt-out for this route only
  @Get('health')
  async health(_req, res) {
    return this.ok(res, 'ok', 'up')
  }

  @Roles('admin', 'manager')    // role check on top of auth
  @Delete(':id')
  async remove(req, res) { ... }
}
```

</div></div><div class="home-fw-tc"><div class="home-fw-panel-meta">
<strong class="home-fw-panel-title">ABAC — attribute-based access</strong>
<p class="home-fw-panel-desc">Define policies once in your <code>AuthGuard</code>. Annotate each route with the action and resource it represents — no policy logic scattered across controllers.</p>
<ul class="home-fw-panel-pts">
<li>Policy check at route level: <code>@Can('create', 'issue')</code></li>
<li>Guard receives action + resource + user context</li>
<li>Composes cleanly with <code>@Auth()</code> and <code>@Roles()</code></li>
</ul>
<a class="hs-cta" href="/guide/auth">ABAC docs →</a>
</div><div class="home-fw-panel-code">

```typescript
@Auth()
@Controller('issues')
export class IssueController extends BaseController {

  @Can('create', 'issue')
  @Post('')
  @Body(CreateIssueSchema)
  async create(req, res) { ... }

  @Can('delete', 'issue')
  @Delete(':id')
  async remove(req, res) { ... }

  @Can('read', 'issue')
  @Get('')
  async list(req, res) { ... }
}
```

</div></div><div class="home-fw-tc"><div class="home-fw-panel-meta">
<strong class="home-fw-panel-title">Multi-tenancy</strong>
<p class="home-fw-panel-desc">Per-request tenant isolation via AsyncLocalStorage. Tenant ID is resolved from an <code>x-tenant-id</code> header or a JWT <code>tid</code> claim — available everywhere in the call stack without prop-drilling.</p>
<ul class="home-fw-panel-pts">
<li><code>@Tenant()</code> on the class or a single method</li>
<li><code>getTenantId()</code> in services and repositories — no args</li>
<li>Configurable: header name and JWT claim are overridable</li>
</ul>
<a class="hs-cta" href="/guide/multi-tenancy">Multi-tenancy docs →</a>
</div><div class="home-fw-panel-code">

```typescript
@Tenant()
@Auth()
@Controller('issues')
export class IssueController extends BaseController {

  @Get('')
  async list(_req, res) {
    const tenantId = getTenantId()
    return this.ok(res, 'ok',
      await this.app.findByProject(tenantId!))
  }
}

// In your service or repository — no extra arguments:
import { getTenantId } from '@banana-universe/bananajs'
const tenantId = getTenantId()   // same ALS store
```

</div></div><div class="home-fw-tc"><div class="home-fw-panel-meta">
<strong class="home-fw-panel-title">Caching</strong>
<p class="home-fw-panel-desc">In-memory response cache with TTL and pattern-based eviction. Swap to Redis via the <code>CacheStore</code> interface. Keys auto-namespace per tenant when <code>@Tenant()</code> is present.</p>
<ul class="home-fw-panel-pts">
<li><code>@Cache({ ttl: 30 })</code> caches the full response</li>
<li><code>@CacheEvict({ pattern: 'list:*' })</code> busts on write</li>
<li>Custom key function: <code>key: (req) => ...</code></li>
</ul>
<a class="hs-cta" href="/guide/caching">Caching docs →</a>
</div><div class="home-fw-panel-code">

```typescript
@Cache({ ttl: 30 })
@Get('')
async list(_req, res) {
  return this.ok(res, 'ok', await this.app.findByProject(...))
}

@CacheEvict({ pattern: 'list:*' })
@Post('')
@Body(CreateIssueSchema)
async create(req, res) {
  return this.ok(res, 'created', await this.app.create(req.body))
}

// Tenant-scoped key:
@Cache({ ttl: 60, key: (req) => `issues:${getTenantId()}` })
@Get('')
async listForTenant(req, res) { ... }
```

</div></div><div class="home-fw-tc"><div class="home-fw-panel-meta">
<strong class="home-fw-panel-title">Throttle · Rate limit</strong>
<p class="home-fw-panel-desc">Sliding-window throttle per user or IP. Fixed-window rate limit at class or method level. Plug in a Redis <code>ThrottleStore</code> for distributed deployments.</p>
<ul class="home-fw-panel-pts">
<li><code>@Throttle</code> — sliding window, keyed by userId or IP</li>
<li><code>@RateLimit</code> — simpler fixed window, class or method</li>
<li>Redis store interface for distributed environments</li>
</ul>
<a class="hs-cta" href="/guide/throttling">Throttle docs →</a>
</div><div class="home-fw-panel-code">

```typescript
// Per-user sliding window
@Throttle({ windowMs: 10_000, max: 5, keyBy: 'userId' })
@Post('')
@Body(CreateIssueSchema)
async create(req, res) { ... }

// Controller-wide fixed window
@RateLimit({ windowMs: 60_000, max: 100 })
@Auth()
@Controller('issues')
export class IssueController extends BaseController { ... }

// Distributed: Redis store
@Throttle({ windowMs: 60_000, max: 20,
            keyBy: 'userId', store: redisThrottleStore })
@Post('comments')
async addComment(req, res) { ... }
```

</div></div><div class="home-fw-tc"><div class="home-fw-panel-meta">
<strong class="home-fw-panel-title">Input sanitization</strong>
<p class="home-fw-panel-desc">Strip HTML from all body string fields before the handler runs. Uses <code>sanitize-html</code> as an optional peer dep — configure allowed tags per route for rich-text fields.</p>
<ul class="home-fw-panel-pts">
<li><code>@Sanitize()</code> — strips all HTML, safe default</li>
<li>Configurable allowlist: tags and attributes per route</li>
<li>Runs before Zod validation — body arrives clean</li>
</ul>
<a class="hs-cta" href="/guide/sanitization">Sanitize docs →</a>
</div><div class="home-fw-panel-code">

```typescript
// Strip all HTML
@Sanitize()
@Post('')
@Body(CreateIssueSchema)
async create(req, res) {
  return this.ok(res, 'created', await this.app.create(req.body))
}

// Allow a safe subset for rich-text fields
@Sanitize({
  allowedTags: ['b', 'i', 'em', 'strong', 'a'],
  allowedAttributes: { a: ['href'] },
})
@Put(':id')
@Body(UpdateIssueSchema)
async update(req, res) { ... }
```

</div></div></div></div></div>
</div>


<footer class="home-footer" aria-label="Site footer">

<div class="home-footer-cols">

<div class="home-footer-col">

<strong>Framework</strong>

<ul>
  <li><a href="/guide/quickstart">Quickstart</a></li>
  <li><a href="/guide/philosophy">Philosophy</a></li>
  <li><a href="/guide/basic-concepts">Core concepts</a></li>
  <li><a href="/guide/validation">Validation</a></li>
  <li><a href="/migration/from-express">Migration from Express</a></li>
</ul>

</div>

<div class="home-footer-col">

<strong>Reference</strong>

<ul>
  <li><a href="/reference/decorators">Decorators</a></li>
  <li><a href="/reference/bananaapp-options">BananaAppOptions</a></li>
  <li><a href="/reference/error-types">Error types</a></li>
  <li><a href="/reference/ddd-primitives">DDD primitives</a></li>
  <li><a href="/api/">TypeDoc API</a></li>
</ul>

</div>

<div class="home-footer-col">

<strong>Integrations</strong>

<ul>
  <li><a href="/integrations/typeorm">TypeORM</a></li>
  <li><a href="/integrations/mongoose">Mongoose</a></li>
  <li><a href="/integrations/opentelemetry">OpenTelemetry</a></li>
  <li><a href="/plugins/websocket">WebSocket</a></li>
  <li><a href="/integrations/llm-providers">LLM providers</a></li>
</ul>

</div>

<div class="home-footer-col">

<strong>AI &amp; Tooling</strong>

<ul>
  <li><a href="/ai/">AI hub</a></li>
  <li><a href="/tooling/ai-commands">AI commands</a></li>
  <li><a href="/mcp/">MCP server</a></li>
  <li><a href="/tooling/cli">CLI reference</a></li>
  <li><a href="/plugins/overview">Plugins</a></li>
</ul>

</div>

</div>

<div class="home-footer-showcase" aria-hidden="true">
  <span class="home-footer-wordmark">BananaJS</span>
</div>

<div class="home-footer-bottom">
  <p class="home-footer-status">
    <span class="status-dot"></span>
    Public Beta
  </p>
  <p class="home-footer-bottom-links">
    <a href="/banana-universe/guide/philosophy">Philosophy</a>
    <a href="/banana-universe/recipes/">Recipes</a>
    <a href="https://github.com/surya-manne/banana-universe" target="_blank" rel="noopener">GitHub</a>
    <a href="https://www.npmjs.com/package/@banana-universe/bananajs" target="_blank" rel="noopener">npm</a>
    <a href="https://github.com/surya-manne/banana-universe/blob/main/LICENSE" target="_blank" rel="noopener">MIT License</a>
  </p>
</div>

</footer>
