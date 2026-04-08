import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import { loadBananarc } from './llm/bananarc.js'
import { appendBananaJsAiRules } from './llm/bananajs-ai-rules.js'
import { resolveLlmProvider } from './llm/provider.factory.js'
import { tryParseJsonObject } from './llm/entity-extraction.js'
import { type BaseCtx, type LlmOperation, LlmOperationError, runLlmOperation } from './llm/pipeline.js'

export interface AiContractOptions {
  /** OpenAPI JSON file to read (from `bananajs openapi export`). */
  spec: string
  /** Consumer name for the Pact contract (e.g. "frontend"). */
  consumer: string
  /** Provider name for the Pact contract (e.g. "api"). */
  provider: string
  /** Directory with JSON fixture files from `bananajs ai mock --format json` — skips LLM payload generation. */
  fixtures?: string
  /** Output directory (default: src/__tests__/contract). */
  out?: string
  /** Preview without writing. */
  dryRun?: boolean
  /** Print raw LLM output. */
  debug?: boolean
  cwd?: string
}

// ─── OpenAPI types (minimal subset) ──────────────────────────────────────────

interface OpenApiSpec {
  info?: { title?: string; version?: string }
  paths?: Record<string, Record<string, OpenApiOperation>>
}

interface OpenApiOperation {
  operationId?: string
  summary?: string
  description?: string
  parameters?: OpenApiParameter[]
  requestBody?: {
    content?: { 'application/json'?: { schema?: OpenApiSchema } }
  }
  responses?: Record<string, { description?: string; content?: { 'application/json'?: { schema?: OpenApiSchema } } }>
}

interface OpenApiParameter {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  required?: boolean
  schema?: { type?: string; example?: unknown }
}

interface OpenApiSchema {
  type?: string
  properties?: Record<string, { type?: string; example?: unknown }>
  example?: unknown
}

// ─── Pact interaction ─────────────────────────────────────────────────────────

export interface PactInteraction {
  state: string
  uponReceiving: string
  withRequest: {
    method: string
    path: string
    headers?: Record<string, string>
    body?: unknown
  }
  willRespondWith: {
    status: number
    headers?: Record<string, string>
    body?: unknown
  }
}

export interface ContractFile {
  consumer: string
  provider: string
  operationId: string
  method: string
  path: string
  interaction: PactInteraction
}

// ─── Fixture loader ───────────────────────────────────────────────────────────

async function loadFixtures(fixturesDir: string, cwd: string): Promise<Map<string, unknown>> {
  const absDir = path.resolve(cwd, fixturesDir)
  const map = new Map<string, unknown>()
  let entries: Awaited<ReturnType<typeof fs.readdir>>
  try {
    entries = await fs.readdir(absDir, { withFileTypes: true })
  } catch {
    return map
  }
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      const abs = path.join(absDir, entry.name)
      try {
        const raw = await fs.readFile(abs, 'utf-8')
        const parsed = JSON.parse(raw) as unknown
        const key = entry.name.replace(/\.fixture\.json$|\.json$/, '')
        map.set(key.toLowerCase(), parsed)
      } catch {
        // skip malformed fixtures
      }
    }
  }
  return map
}

// ─── LLM-driven payload generation ───────────────────────────────────────────

async function generatePayloadViaLlm(
  provider: Awaited<ReturnType<typeof resolveLlmProvider>>,
  op: OpenApiOperation,
  method: string,
  urlPath: string,
  debug: boolean,
): Promise<{ requestBody?: unknown; responseBody?: unknown }> {
  const system = appendBananaJsAiRules(
    'You are a contract test data generator. Given an OpenAPI operation, produce realistic sample payloads in JSON.\n' +
    'Output a JSON object with two optional keys:\n' +
    '  "requestBody": the sample request body (for POST/PUT/PATCH)\n' +
    '  "responseBody": the sample 2xx response body\n' +
    'Use sensible realistic values. Match field types from the schema. Output ONLY the JSON object — no prose, no markdown.',
  )
  const opDesc = JSON.stringify({ method, path: urlPath, operation: op }, null, 2)
  const raw = await provider.generate(opDesc, { system, temperature: 0.2 })
  if (debug) process.stderr.write(`[ai contract] raw LLM output:\n${raw}\n`)
  const parsed = tryParseJsonObject(raw)
  return (parsed as { requestBody?: unknown; responseBody?: unknown }) ?? {}
}

// ─── Contract generation ──────────────────────────────────────────────────────

async function buildInteraction(
  consumer: string,
  provider: string,
  method: string,
  urlPath: string,
  op: OpenApiOperation,
  fixtures: Map<string, unknown>,
  llmProvider: Awaited<ReturnType<typeof resolveLlmProvider>> | null,
  debug: boolean,
): Promise<PactInteraction> {
  const opId = op.operationId ?? `${method}-${urlPath.replace(/[^a-zA-Z0-9]/g, '-')}`
  const summary = op.summary ?? `${method.toUpperCase()} ${urlPath}`

  // Resolve path parameters (replace :param and {param} with realistic values)
  const resolvedPath = urlPath.replace(/\{(\w+)\}|:(\w+)/g, (_, brace, colon) => {
    const name = brace ?? colon
    if (name.toLowerCase().includes('id')) return '1'
    return `sample-${name}`
  })

  // Request body
  let requestBody: unknown = undefined
  const needsBody = ['post', 'put', 'patch'].includes(method.toLowerCase())

  if (needsBody) {
    // Try to get from fixtures first (match by operationId substring)
    const fixtureKey = [...fixtures.keys()].find(
      (k) => opId.toLowerCase().includes(k) || k.includes(opId.toLowerCase()),
    )
    if (fixtureKey) {
      requestBody = fixtures.get(fixtureKey)
    } else if (llmProvider) {
      const payloads = await generatePayloadViaLlm(llmProvider, op, method, urlPath, debug)
      requestBody = payloads.requestBody
    } else {
      // Fallback: derive from schema properties
      const schema = op.requestBody?.content?.['application/json']?.schema
      if (schema?.properties) {
        requestBody = Object.fromEntries(
          Object.entries(schema.properties).map(([k, v]) => [
            k,
            v.example ?? (v.type === 'number' ? 1 : v.type === 'boolean' ? true : `sample-${k}`),
          ]),
        )
      }
    }
  }

  // Response body
  let responseBody: unknown = undefined
  const successResponse = op.responses?.['200'] ?? op.responses?.['201']
  const responseSchema = successResponse?.content?.['application/json']?.schema

  if (responseSchema?.properties) {
    responseBody = Object.fromEntries(
      Object.entries(responseSchema.properties).map(([k, v]) => [
        k,
        v.example ?? (v.type === 'number' ? 1 : v.type === 'boolean' ? true : `sample-${k}`),
      ]),
    )
  } else if (llmProvider && !responseBody) {
    const payloads = await generatePayloadViaLlm(llmProvider, op, method, urlPath, debug)
    responseBody = payloads.responseBody
  }

  const httpStatus = op.responses
    ? parseInt(Object.keys(op.responses).find((k) => k.startsWith('2')) ?? '200', 10)
    : 200

  return {
    state: `${provider} is in a valid state for ${summary}`,
    uponReceiving: `a ${method.toUpperCase()} request to ${urlPath} from ${consumer}`,
    withRequest: {
      method: method.toUpperCase(),
      path: resolvedPath,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      ...(requestBody !== undefined ? { body: requestBody } : {}),
    },
    willRespondWith: {
      status: httpStatus,
      headers: { 'Content-Type': 'application/json' },
      ...(responseBody !== undefined ? { body: responseBody } : {}),
    },
  }
}

// ─── Code emitter ─────────────────────────────────────────────────────────────

function emitPactTestFile(
  consumer: string,
  providerName: string,
  contracts: ContractFile[],
): string {
  const interactions = contracts
    .map(
      (c) =>
        `  // ${c.method.toUpperCase()} ${c.path}\n` +
        `  provider\n    .given(${JSON.stringify(c.interaction.state)})\n` +
        `    .uponReceiving(${JSON.stringify(c.interaction.uponReceiving)})\n` +
        `    .withRequest(${JSON.stringify(c.interaction.withRequest, null, 2).split('\n').join('\n    ')})\n` +
        `    .willRespondWith(${JSON.stringify(c.interaction.willRespondWith, null, 2).split('\n').join('\n    ')})`,
    )
    .join('\n\n')

  return `/**
 * Consumer contract tests — generated by \`bananajs ai contract\`
 * Consumer : ${consumer}
 * Provider : ${providerName}
 *
 * Requires @pact-foundation/pact (optional peer dependency).
 * Run: npx pact-js-consumer-tests  (or configure in your test runner)
 */
import { Pact } from '@pact-foundation/pact'
import path from 'path'

// Initialize Pact consumer
const provider = new Pact({
  consumer: ${JSON.stringify(consumer)},
  provider: ${JSON.stringify(providerName)},
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  logLevel: 'warn',
  dir: path.resolve(process.cwd(), 'pacts'),
})

describe('${consumer} <-> ${providerName} contract', () => {
  beforeAll(() => provider.setup())
  afterAll(() => provider.finalize())
  afterEach(() => provider.verify())

${interactions}
})
`
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const

interface ContractCtx extends BaseCtx {
  cwd: string
  opts: AiContractOptions
  spec: OpenApiSpec
  fixtures: Map<string, unknown>
  // null when using fixtures exclusively
  llmProvider: Awaited<ReturnType<typeof resolveLlmProvider>> | null
  contracts: ContractFile[]
  outFile: string
  content: string
}

const contractOperation: LlmOperation<AiContractOptions, ContractCtx, void> = {
  name: 'ai-contract',

  // Prepare: load fixtures, resolve LLM provider
  async prepare(opts) {
    const cwd = opts.cwd ?? process.cwd()
    const config = await loadBananarc(cwd)
    const provider = resolveLlmProvider(config)

    const fixtures = opts.fixtures ? await loadFixtures(opts.fixtures, cwd) : new Map<string, unknown>()
    if (opts.fixtures) {
      console.log(chalk.cyan(`Loaded ${fixtures.size} fixtures from ${opts.fixtures}`))
    }

    // Suppress LLM when dry-run (schema fallback only) or when fixtures fully cover payloads
    const llmProvider: Awaited<ReturnType<typeof resolveLlmProvider>> | null =
      opts.dryRun || (opts.fixtures && fixtures.size > 0) ? null : provider

    const outDir = path.resolve(cwd, opts.out ?? path.join('src', '__tests__', 'contract'))
    const outFile = path.join(outDir, `${opts.consumer}-${opts.provider}.contract.test.ts`)

    return {
      cwd,
      opts,
      spec: {} as OpenApiSpec,
      fixtures,
      llmProvider,
      contracts: [],
      outFile,
      content: '',
      provider,
      providerAvailable: true,
      debug: opts.debug ?? false,
    }
  },

  // Research: load spec + validate it has paths
  async research(ctx) {
    const specPath = path.resolve(ctx.cwd, ctx.opts.spec)
    let spec: OpenApiSpec
    try {
      const raw = await fs.readFile(specPath, 'utf-8')
      spec = JSON.parse(raw) as OpenApiSpec
    } catch (e) {
      throw new Error(
        `Cannot read spec: ${specPath}\n${e instanceof Error ? e.message : String(e)}`,
      )
    }
    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      throw new Error('No paths found in OpenAPI spec.')
    }
    ctx.spec = spec
    return ctx
  },

  // Plan: nothing to pre-build (buildInteraction constructs prompts lazily)
  async plan(ctx) {
    return ctx
  },

  // Act: build Pact interaction per operation (may call LLM per operation)
  async act(ctx) {
    for (const [urlPath, pathItem] of Object.entries(ctx.spec.paths ?? {})) {
      for (const method of HTTP_METHODS) {
        const op = (pathItem as Record<string, OpenApiOperation>)[method]
        if (!op) continue

        const interaction = await buildInteraction(
          ctx.opts.consumer,
          ctx.opts.provider,
          method,
          urlPath,
          op,
          ctx.fixtures,
          ctx.llmProvider,
          ctx.debug,
        )

        ctx.contracts.push({
          consumer: ctx.opts.consumer,
          provider: ctx.opts.provider,
          operationId: op.operationId ?? `${method}-${urlPath}`,
          method,
          path: urlPath,
          interaction,
        })
      }
    }
    return ctx
  },

  // Validate: emit test file or dry-run
  async validate(ctx) {
    if (ctx.contracts.length === 0) {
      console.log(chalk.yellow('No operations found in spec — nothing to generate.'))
      return
    }

    ctx.content = emitPactTestFile(ctx.opts.consumer, ctx.opts.provider, ctx.contracts)

    if (ctx.opts.dryRun) {
      console.log(chalk.cyan(`[dry-run] Would write: ${ctx.outFile}`))
      console.log(chalk.gray('─'.repeat(60)))
      console.log(chalk.gray(ctx.content))
      console.log(chalk.bold.green(`\n✔ ${ctx.contracts.length} interactions generated (dry-run)`))
      return
    }

    await fs.mkdir(path.dirname(ctx.outFile), { recursive: true })
    await fs.writeFile(ctx.outFile, ctx.content, 'utf-8')
    console.log(chalk.green(`Created: ${ctx.outFile}`))
    console.log(chalk.bold.green(`\n✔ ${ctx.contracts.length} Pact interactions written`))
    console.log(chalk.gray('\nNote: @pact-foundation/pact must be installed as a dev dependency.'))
    console.log(chalk.gray('  npm install --save-dev @pact-foundation/pact'))
  },
}

export async function runAiContract(options: AiContractOptions): Promise<void> {
  try {
    await runLlmOperation(contractOperation, options, options.debug)
  } catch (e) {
    if (e instanceof LlmOperationError) {
      console.error(chalk.red(`ai contract failed [${e.stage}]: ${e.cause.message}`))
    } else {
      console.error(chalk.red('ai contract failed:'), e instanceof Error ? e.message : String(e))
    }
    process.exit(1)
  }
}
