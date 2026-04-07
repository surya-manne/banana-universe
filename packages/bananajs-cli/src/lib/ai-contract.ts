import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import { loadBananarc } from './llm/bananarc.js'
import { appendBananaJsAiRules } from './llm/bananajs-ai-rules.js'
import { resolveLlmProvider } from './llm/provider.factory.js'
import { tryParseJsonObject } from './llm/entity-extraction.js'

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

export async function runAiContract(options: AiContractOptions): Promise<void> {
  const cwd = options.cwd ?? process.cwd()

  // Read OpenAPI spec
  const specPath = path.resolve(cwd, options.spec)
  let spec: OpenApiSpec
  try {
    const raw = await fs.readFile(specPath, 'utf-8')
    spec = JSON.parse(raw) as OpenApiSpec
  } catch (e) {
    console.error(chalk.red(`Cannot read spec: ${specPath}`))
    console.error(chalk.gray(e instanceof Error ? e.message : String(e)))
    process.exit(1)
  }

  if (!spec.paths || Object.keys(spec.paths).length === 0) {
    console.error(chalk.red('No paths found in OpenAPI spec.'))
    process.exit(1)
  }

  // Load fixtures (if provided — skips LLM for request payloads)
  const fixtures = options.fixtures ? await loadFixtures(options.fixtures, cwd) : new Map<string, unknown>()
  if (options.fixtures) {
    console.log(chalk.cyan(`Loaded ${fixtures.size} fixtures from ${options.fixtures}`))
  }

  // LLM provider (optional — used only when fixtures don't cover a payload)
  let llmProvider: Awaited<ReturnType<typeof resolveLlmProvider>> | null = null
  if (!options.fixtures || fixtures.size === 0) {
    try {
      const config = await loadBananarc(cwd)
      llmProvider = resolveLlmProvider(config)
    } catch {
      // No LLM — proceed with schema-derived defaults
    }
  }

  // Build interaction pairs per operation
  const contracts: ContractFile[] = []
  const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete']

  for (const [urlPath, pathItem] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const op = (pathItem as Record<string, OpenApiOperation>)[method]
      if (!op) continue

      const interaction = await buildInteraction(
        options.consumer,
        options.provider,
        method,
        urlPath,
        op,
        fixtures,
        llmProvider,
        options.debug ?? false,
      )

      contracts.push({
        consumer: options.consumer,
        provider: options.provider,
        operationId: op.operationId ?? `${method}-${urlPath}`,
        method,
        path: urlPath,
        interaction,
      })
    }
  }

  if (contracts.length === 0) {
    console.log(chalk.yellow('No operations found in spec — nothing to generate.'))
    return
  }

  // Emit test file
  const outDir = path.resolve(cwd, options.out ?? path.join('src', '__tests__', 'contract'))
  const outFile = path.join(outDir, `${options.consumer}-${options.provider}.contract.test.ts`)
  const content = emitPactTestFile(options.consumer, options.provider, contracts)

  if (options.dryRun) {
    console.log(chalk.cyan(`[dry-run] Would write: ${outFile}`))
    console.log(chalk.gray('─'.repeat(60)))
    console.log(chalk.gray(content))
    console.log(chalk.bold.green(`\n✔ ${contracts.length} interactions generated (dry-run)`))
    return
  }

  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(outFile, content, 'utf-8')
  console.log(chalk.green(`Created: ${outFile}`))
  console.log(chalk.bold.green(`\n✔ ${contracts.length} Pact interactions written`))
  console.log(chalk.gray('\nNote: @pact-foundation/pact must be installed as a dev dependency.'))
  console.log(chalk.gray('  npm install --save-dev @pact-foundation/pact'))
}
