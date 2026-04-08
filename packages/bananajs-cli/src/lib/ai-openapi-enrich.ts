import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import { loadBananarc } from './llm/bananarc.js'
import { appendBananaJsAiRules } from './llm/bananajs-ai-rules.js'
import { resolveLlmProvider } from './llm/provider.factory.js'
import { type BaseCtx, type LlmOperation, LlmOperationError, runLlmOperation } from './llm/pipeline.js'

/** Subset of OpenAPI 3.0 types we operate on. */
interface OpenApiInfo {
  title?: string
  description?: string
  version?: string
}

interface OpenApiParameter {
  name: string
  in: string
  description?: string
  required?: boolean
  schema?: Record<string, unknown>
}

interface OpenApiResponse {
  description?: string
  content?: Record<string, unknown>
}

interface OpenApiOperation {
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
  parameters?: OpenApiParameter[]
  requestBody?: Record<string, unknown>
  responses?: Record<string, OpenApiResponse>
}

interface OpenApiPathItem {
  get?: OpenApiOperation
  post?: OpenApiOperation
  put?: OpenApiOperation
  patch?: OpenApiOperation
  delete?: OpenApiOperation
}

interface OpenApiSpec {
  openapi?: string
  info?: OpenApiInfo
  paths?: Record<string, OpenApiPathItem>
  components?: Record<string, unknown>
  'x-enriched-by'?: string
}

const HTTP_VERBS = ['get', 'post', 'put', 'patch', 'delete'] as const
type HttpVerb = (typeof HTTP_VERBS)[number]

export interface AiOpenApiEnrichOptions {
  in: string
  out: string
  dryRun?: boolean
  skipExamples?: boolean
  skipTags?: boolean
  cwd?: string
}

// ─── Spec loading ─────────────────────────────────────────────────────────────

async function loadSpec(specPath: string): Promise<OpenApiSpec> {
  let raw: string
  try {
    raw = await fs.readFile(specPath, 'utf-8')
  } catch {
    console.error(chalk.red(`Spec file not found: ${specPath}`))
    process.exit(1)
  }
  try {
    return JSON.parse(raw) as OpenApiSpec
  } catch {
    console.error(chalk.red(`Failed to parse spec as JSON: ${specPath}`))
    process.exit(1)
  }
}

// ─── Missing detection ────────────────────────────────────────────────────────

interface EnrichmentTarget {
  path: string
  verb: HttpVerb
  operation: OpenApiOperation
  missingFields: Array<'summary' | 'description' | 'tags' | 'paramDescriptions' | 'responseDescriptions'>
}

function detectMissingFields(
  operation: OpenApiOperation,
  opts: AiOpenApiEnrichOptions,
): EnrichmentTarget['missingFields'] {
  const missing: EnrichmentTarget['missingFields'] = []
  if (!operation.summary) missing.push('summary')
  if (!operation.description) missing.push('description')
  if (!opts.skipTags && (!operation.tags || operation.tags.length === 0)) missing.push('tags')
  const hasUndescribedParam = operation.parameters?.some((p) => !p.description)
  if (hasUndescribedParam) missing.push('paramDescriptions')
  if (!opts.skipExamples) {
    const hasUndescribedResponse = operation.responses &&
      Object.values(operation.responses).some((r) => !r.description)
    if (hasUndescribedResponse) missing.push('responseDescriptions')
  }
  return missing
}

function collectTargets(spec: OpenApiSpec, opts: AiOpenApiEnrichOptions): EnrichmentTarget[] {
  const targets: EnrichmentTarget[] = []
  for (const [route, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const verb of HTTP_VERBS) {
      const op = pathItem[verb]
      if (!op) continue
      const missingFields = detectMissingFields(op, opts)
      if (missingFields.length > 0) {
        targets.push({ path: route, verb, operation: op, missingFields })
      }
    }
  }
  return targets
}

// ─── LLM enrichment ───────────────────────────────────────────────────────────

interface EnrichmentPatch {
  summary?: string
  description?: string
  tags?: string[]
  paramDescriptions?: Record<string, string>
  responseDescriptions?: Record<string, string>
}

function buildEnrichmentPrompt(target: EnrichmentTarget): string {
  const opSummary = {
    path: target.path,
    verb: target.verb.toUpperCase(),
    operationId: target.operation.operationId,
    parameters: target.operation.parameters?.map((p) => ({ name: p.name, in: p.in, schema: p.schema })),
    requestBody: target.operation.requestBody ? '(present)' : undefined,
    responding: Object.keys(target.operation.responses ?? {}),
    missing: target.missingFields,
  }
  return JSON.stringify(opSummary)
}

const ENRICH_SYSTEM = `You are an OpenAPI documentation specialist for BananaJS REST APIs.
Given a JSON description of an API operation and its missing documentation fields, return ONLY a JSON object with these optional keys:
- "summary": one-line operation title (max 80 chars)
- "description": 1-3 sentence description of what the operation does
- "tags": array of 1-3 strings grouping related endpoints (derive from path segments)
- "paramDescriptions": object mapping parameter names to short descriptions (1 sentence each)
- "responseDescriptions": object mapping HTTP status codes ("200", "404", etc.) to descriptions

Include ONLY the keys that correspond to missing fields requested. Return valid JSON only, no markdown fences.`

async function enrichOperation(
  target: EnrichmentTarget,
  provider: ReturnType<typeof resolveLlmProvider>,
): Promise<EnrichmentPatch> {
  const system = appendBananaJsAiRules(ENRICH_SYSTEM)
  const prompt = buildEnrichmentPrompt(target)

  let raw: string
  try {
    raw = await provider.generate(prompt, { system, temperature: 0.1 })
  } catch (err) {
    console.warn(chalk.yellow(`  ⚠ LLM call failed for ${target.verb.toUpperCase()} ${target.path}: ${String(err)}`))
    return {}
  }

  // Strip any accidental markdown fences
  const cleaned = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  try {
    return JSON.parse(cleaned) as EnrichmentPatch
  } catch {
    console.warn(chalk.yellow(`  ⚠ Could not parse LLM response for ${target.verb.toUpperCase()} ${target.path}`))
    return {}
  }
}

// ─── Patch application ────────────────────────────────────────────────────────

function applyPatch(operation: OpenApiOperation, patch: EnrichmentPatch, opts: AiOpenApiEnrichOptions): void {
  if (patch.summary && !operation.summary) {
    operation.summary = patch.summary
  }
  if (patch.description && !operation.description) {
    operation.description = patch.description
  }
  if (!opts.skipTags && patch.tags && (!operation.tags || operation.tags.length === 0)) {
    operation.tags = patch.tags
  }
  if (patch.paramDescriptions && operation.parameters) {
    for (const param of operation.parameters) {
      if (!param.description && patch.paramDescriptions[param.name]) {
        param.description = patch.paramDescriptions[param.name]
      }
    }
  }
  if (!opts.skipExamples && patch.responseDescriptions && operation.responses) {
    for (const [code, response] of Object.entries(operation.responses)) {
      if (!response.description && patch.responseDescriptions[code]) {
        response.description = patch.responseDescriptions[code]
      }
    }
  }
}

// ─── Diff summary ─────────────────────────────────────────────────────────────

interface DiffEntry {
  operation: string
  added: string[]
}

function buildDiffSummary(targets: EnrichmentTarget[], enriched: Map<EnrichmentTarget, EnrichmentPatch>): DiffEntry[] {
  const diff: DiffEntry[] = []
  for (const target of targets) {
    const patch = enriched.get(target) ?? {}
    const added: string[] = []
    if (patch.summary) added.push('summary')
    if (patch.description) added.push('description')
    if (patch.tags) added.push('tags')
    if (patch.paramDescriptions && Object.keys(patch.paramDescriptions).length > 0) added.push('paramDescriptions')
    if (patch.responseDescriptions && Object.keys(patch.responseDescriptions).length > 0) added.push('responseDescriptions')
    if (added.length > 0) {
      diff.push({ operation: `${target.verb.toUpperCase()} ${target.path}`, added })
    }
  }
  return diff
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface OpenApiEnrichCtx extends BaseCtx {
  cwd: string
  specPath: string
  outPath: string
  opts: AiOpenApiEnrichOptions
  spec: OpenApiSpec
  targets: EnrichmentTarget[]
  enriched: Map<EnrichmentTarget, EnrichmentPatch>
}

const openApiEnrichOperation: LlmOperation<AiOpenApiEnrichOptions, OpenApiEnrichCtx, void> = {
  name: 'ai-openapi-enrich',

  // Prepare: assert --out !== --in FIRST, then resolve paths and provider
  async prepare(opts) {
    const cwd = opts.cwd ?? process.cwd()
    const specPath = path.resolve(cwd, opts.in)
    const outPath = path.resolve(cwd, opts.out)

    if (specPath === outPath && !opts.dryRun) {
      throw new Error(
        '--out must differ from --in. Use a different output path to avoid overwriting the original spec.',
      )
    }

    console.log(chalk.bold.blue('\nAI OpenAPI Enrich\n'))
    console.log(chalk.dim(`  In:  ${opts.in}`))
    console.log(chalk.dim(`  Out: ${opts.dryRun ? '(dry-run)' : opts.out}`))
    console.log('')

    const config = await loadBananarc(cwd)
    const provider = resolveLlmProvider(config)

    return {
      cwd,
      specPath,
      outPath,
      opts,
      spec: {} as OpenApiSpec,
      targets: [],
      enriched: new Map(),
      provider,
      providerAvailable: true,
      debug: false,
    }
  },

  // Research: load spec and collect operations with missing documentation
  async research(ctx) {
    ctx.spec = await loadSpec(ctx.specPath)
    ctx.targets = collectTargets(ctx.spec, ctx.opts)
    return ctx
  },

  // Plan: log what will be enriched
  async plan(ctx) {
    if (ctx.targets.length === 0) return ctx
    console.log(chalk.dim(`  Operations with missing documentation: ${ctx.targets.length}`))
    console.log('')
    return ctx
  },

  // Act: sequential LLM enrichment per target; apply patch to spec in place
  async act(ctx) {
    for (const target of ctx.targets) {
      const label = `${target.verb.toUpperCase()} ${target.path}`
      process.stdout.write(chalk.dim(`  Enriching ${label}...`))
      const patch = await enrichOperation(target, ctx.provider)
      ctx.enriched.set(target, patch)

      const pathItem = ctx.spec.paths?.[target.path]
      const op = pathItem?.[target.verb]
      if (op) {
        applyPatch(op, patch, ctx.opts)
      }
      process.stdout.write(chalk.green(' done\n'))
    }

    ctx.spec['x-enriched-by'] = `bananajs-cli@${process.env['npm_package_version'] ?? 'local'}`
    return ctx
  },

  // Validate: emit dry-run diff or write enriched spec
  async validate(ctx) {
    if (ctx.targets.length === 0) {
      console.log(chalk.green('✔ Spec is already fully documented — nothing to enrich.'))
      return
    }

    const diff = buildDiffSummary(ctx.targets, ctx.enriched)

    if (ctx.opts.dryRun) {
      console.log('')
      console.log(chalk.bold('Dry-run diff — proposed changes:'))
      for (const entry of diff) {
        console.log(chalk.cyan(`  ${entry.operation}`))
        console.log(chalk.gray(`    + ${entry.added.join(', ')}`))
      }
      console.log('')
      console.log(chalk.dim(`Total: ${diff.length} operations would be enriched.`))
      return
    }

    const enrichedJson = JSON.stringify(ctx.spec, null, 2)
    await fs.mkdir(path.dirname(ctx.outPath), { recursive: true })
    await fs.writeFile(ctx.outPath, enrichedJson, 'utf-8')

    console.log('')
    console.log(chalk.bold('Done.'))
    console.log(chalk.green(`  ✔ Enriched spec written to ${ctx.opts.out}`))
    console.log('')
    console.log(chalk.bold('Summary:'))
    for (const entry of diff) {
      console.log(chalk.cyan(`  ${entry.operation}`))
      console.log(chalk.gray(`    + ${entry.added.join(', ')}`))
    }
  },
}

export async function runAiOpenApiEnrich(opts: AiOpenApiEnrichOptions): Promise<void> {
  try {
    await runLlmOperation(openApiEnrichOperation, opts)
  } catch (e) {
    if (e instanceof LlmOperationError) {
      console.error(chalk.red(`ai openapi enrich failed [${e.stage}]: ${e.cause.message}`))
    } else {
      console.error(
        chalk.red('ai openapi enrich failed:'),
        e instanceof Error ? e.message : String(e),
      )
    }
    process.exit(1)
  }
}
