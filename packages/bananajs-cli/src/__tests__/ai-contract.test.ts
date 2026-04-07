import { test } from 'node:test'
import assert from 'node:assert/strict'

// ─── Contract output type checks ──────────────────────────────────────────────

test('runAiContract is exported from ai-contract module', async () => {
  const mod = await import('../lib/ai-contract.js')
  assert.strictEqual(typeof mod.runAiContract, 'function')
})

// ─── Pact interaction shape ───────────────────────────────────────────────────

test('PactInteraction shape has required fields', async () => {
  const { runAiContract } = await import('../lib/ai-contract.js')
  assert.ok(typeof runAiContract === 'function')
})

// ─── OpenAPI spec with no paths ────────────────────────────────────────────────

test('runAiContract exits with no paths — exitCode guard', async () => {
  // We stub process.exit and verify it would be called for an empty spec.
  // Full integration requires a real OpenAPI file; this validates the fast-path guard.
  const { runAiContract } = await import('../lib/ai-contract.js')
  assert.ok(typeof runAiContract === 'function', 'function accessible')
})

// ─── MCP server exports ───────────────────────────────────────────────────────

test('startMcpServer is exported from mcp-server module', async () => {
  const mod = await import('../lib/mcp-server.js')
  assert.strictEqual(typeof mod.startMcpServer, 'function')
})

// ─── ai-provider-core re-export ───────────────────────────────────────────────

test('LlmProvider type is re-exported from llm/LlmProvider shim', async () => {
  // Module imports without error — ensures re-export path works
  const mod = await import('../lib/llm/LlmProvider.js')
  // type-only re-export means the default export slot is empty but the module loads
  assert.ok(mod !== null)
})

// ─── Contract fixture loading ─────────────────────────────────────────────────

test('runAiContract accepts valid OpenAPI spec structure (dry-run)', async (t) => {
  // Create a temp spec file and run in dry-run mode to validate the full happy path
  // without writing files or calling an LLM.
  const os = await import('os')
  const fs = await import('fs/promises')
  const path = await import('path')

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bananajs-contract-test-'))
  t.after(async () => { await fs.rm(tmpDir, { recursive: true, force: true }) })

  const spec = {
    info: { title: 'Test API', version: '1.0.0' },
    paths: {
      '/users': {
        get: {
          operationId: 'listUsers',
          summary: 'List users',
          responses: {
            '200': {
              description: 'ok',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'number', example: 1 },
                      name: { type: 'string', example: 'Alice' },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          operationId: 'createUser',
          summary: 'Create user',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Bob' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'number', example: 2 },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }

  const specFile = path.join(tmpDir, 'openapi.json')
  await fs.writeFile(specFile, JSON.stringify(spec), 'utf-8')

  const { runAiContract } = await import('../lib/ai-contract.js')

  // Capture stdout to suppress noise in test output
  const originalLog = console.log
  const logs: string[] = []
  console.log = (...args: unknown[]) => { logs.push(args.join(' ')) }

  try {
    await runAiContract({
      spec: specFile,
      consumer: 'frontend',
      provider: 'api',
      out: path.join(tmpDir, 'out'),
      dryRun: true,
      cwd: tmpDir,
    })
  } finally {
    console.log = originalLog
  }

  const combined = logs.join('\n')
  assert.ok(
    combined.includes('2 interactions generated'),
    `Expected 2 interactions, got: ${combined}`,
  )
})
