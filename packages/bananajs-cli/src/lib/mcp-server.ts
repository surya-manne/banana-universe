/**
 * BananaJS MCP Server — stdio transport.
 *
 * Exposes 8 BananaJS AI capabilities as MCP tools so IDE agents
 * (Claude Code, Cursor, GitHub Copilot Workspace, etc.) can invoke
 * them without shell scripts.
 *
 * Protocol: JSON-RPC 2.0 over stdio with newline-delimited JSON (NDJSON).
 *
 * Tools exposed:
 *   bananajs_routes        — static route scan
 *   bananajs_explain       — LLM file summary
 *   bananajs_review        — structured AI review (AiReviewJson)
 *   bananajs_plan_module   — use-case analysis + HITL questions (must call before bananajs_generate for non-trivial modules)
 *   bananajs_generate      — DDD module generation (accepts optional context from bananajs_plan_module)
 *   bananajs_mock          — fixture factory generation
 *   bananajs_debug         — stack trace root-cause analysis (AiDebugJson)
 *   bananajs_perf          — performance antipattern scan (AiReviewJson)
 *   bananajs_upgrade       — migration hints (dry-run only — --apply NOT exposed)
 */

import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// ─── JSON-RPC framing ────────────────────────────────────────────────────────

type JsonRpcId = number | string | null

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: JsonRpcId
  method: string
  params?: unknown
}

interface JsonRpcResult {
  jsonrpc: '2.0'
  id: JsonRpcId
  result: unknown
}

interface JsonRpcError {
  jsonrpc: '2.0'
  id: JsonRpcId
  error: { code: number; message: string; data?: unknown }
}

function send(msg: JsonRpcResult | JsonRpcError): void {
  process.stdout.write(JSON.stringify(msg) + '\n')
}

function ok(id: JsonRpcId, result: unknown): void {
  send({ jsonrpc: '2.0', id: id ?? null, result })
}

function err(id: JsonRpcId, code: number, message: string, data?: unknown): void {
  send({ jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data ? { data } : {}) } })
}

// ─── Input reader (MCP stdio = newline-delimited JSON) ───────────────────────

async function* readFramedMessages(stream: NodeJS.ReadableStream): AsyncGenerator<string> {
  let buf = ''

  for await (const chunk of stream) {
    buf += (chunk as Buffer).toString('utf-8')
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed) yield trimmed
    }
  }

  // flush any remaining non-newline-terminated content
  const trimmed = buf.trim()
  if (trimmed) yield trimmed
}

// ─── CLI runner ──────────────────────────────────────────────────────────────

/** Path to the bananajs CLI. When MCP server is invoked via `bananajs mcp start`, this IS that binary. */
const CLI_BIN = process.argv[1]

async function runCli(args: string[], cwd?: string): Promise<string> {
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [CLI_BIN, ...args],
    { cwd: cwd ?? process.cwd(), env: process.env, encoding: 'utf-8' },
  ).catch((e: { stdout?: string; stderr?: string; message: string }) => ({
    stdout: e.stdout ?? '',
    stderr: e.stderr ?? e.message,
  }))
  return stdout || stderr
}

// ─── Tool definitions ────────────────────────────────────────────────────────

interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

const TOOLS: McpTool[] = [
  {
    name: 'bananajs_routes',
    description: 'Static scan of a BananaJS project to list all registered HTTP routes (controller, method, path, handler).',
    inputSchema: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Source directory to scan (default: src)', default: 'src' },
        cwd: { type: 'string', description: 'Project root directory (default: process.cwd())' },
      },
    },
  },
  {
    name: 'bananajs_explain',
    description: 'LLM-generated summary of a TypeScript file: purpose, exports, routes, domain logic, and potential issues.',
    inputSchema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', description: 'Path to the TypeScript file to explain (relative to cwd)' },
        cwd: { type: 'string', description: 'Project root directory (default: process.cwd())' },
      },
    },
  },
  {
    name: 'bananajs_review',
    description: 'Structured AI code review returning AiReviewJson (schemaVersion, summary, findings[]). Ideal for CI gates.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to a TypeScript file to review' },
        module: { type: 'string', description: 'Directory path (e.g. src/modules/orders) — all .ts files reviewed' },
        cwd: { type: 'string', description: 'Project root directory' },
      },
    },
  },
  {
    name: 'bananajs_plan_module',
    description:
      'Analyse a natural-language module description and return a use-case classification plus HITL clarifying questions that must be answered before code generation. ' +
      'Call this first when generating a non-trivial module (payments, webhooks, integrations, sagas, auth). ' +
      'When hitlRequired is true in the response, present the questions to the user, collect answers, then call bananajs_generate with the context field set to the JSON-serialised plan+answers.',
    inputSchema: {
      type: 'object',
      required: ['description'],
      properties: {
        description: {
          type: 'string',
          description: 'Natural language description of the module (e.g. "Payments module with Stripe webhook handling")',
        },
        cwd: { type: 'string', description: 'Project root directory (default: process.cwd())' },
      },
    },
  },
  {
    name: 'bananajs_generate',
    description: 'Generate a full DDD BananaJS module (controller, domain entities, application services, repository port + adapter) from a natural language description.',
    inputSchema: {
      type: 'object',
      required: ['description'],
      properties: {
        description: { type: 'string', description: 'Natural language description of the module (e.g. "order management with status transitions")' },
        orm: { type: 'string', enum: ['typeorm', 'mongoose', 'none'], description: 'ORM to use (default: from .bananarc.json)', default: 'typeorm' },
        out: { type: 'string', description: 'Output base directory (default: ./src)' },
        dryRun: { type: 'boolean', description: 'If true, print files without writing', default: false },
        context: {
          type: 'string',
          description:
            'JSON-serialised UseCaseContext object from a prior bananajs_plan_module call with developer answers filled in. ' +
            'Required when the plan returned hitlRequired: true. ' +
            'Shape: { "analysis": <plan output>, "answers": { "<questionId>": "<answer>", ... } }',
        },
        cwd: { type: 'string', description: 'Project root directory' },
      },
    },
  },
  {
    name: 'bananajs_mock',
    description: 'Generate TypeScript fixture factories and JSON samples from a Zod schema file.',
    inputSchema: {
      type: 'object',
      properties: {
        schema: { type: 'string', description: 'Path to a TypeScript file containing Zod schemas' },
        module: { type: 'string', description: 'Directory — generates fixtures for all Zod schema files found' },
        out: { type: 'string', description: 'Output directory for __fixtures__ folder' },
        format: { type: 'string', enum: ['ts', 'json'], default: 'ts', description: 'Output format' },
        dryRun: { type: 'boolean', description: 'If true, print files without writing', default: true },
        cwd: { type: 'string', description: 'Project root directory' },
      },
    },
  },
  {
    name: 'bananajs_debug',
    description: 'Analyze a BananaJS runtime error or stack trace; returns AiDebugJson with rootCause, location, fix, and severity.',
    inputSchema: {
      type: 'object',
      required: ['input'],
      properties: {
        input: { type: 'string', description: 'The stack trace or error message text to analyze' },
        file: { type: 'string', description: 'Optional path to source file for additional context' },
        cwd: { type: 'string', description: 'Project root directory' },
      },
    },
  },
  {
    name: 'bananajs_perf',
    description: 'Static + optional LLM scan for performance antipatterns (N+1, unbounded queries, missing @Cache, Mongoose without .lean()). Returns AiReviewJson.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to a TypeScript file to analyze' },
        module: { type: 'string', description: 'Directory or bare module name (e.g. orders) — all .ts files' },
        cwd: { type: 'string', description: 'Project root directory' },
      },
    },
  },
  {
    name: 'bananajs_upgrade',
    description: 'Scan codebase for deprecated BananaJS patterns. Returns migration hints per file. NOTE: --apply is intentionally NOT exposed — use the CLI directly to apply changes.',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Target BananaJS version (e.g. 0.6.0); default: all patterns' },
        cwd: { type: 'string', description: 'Project root directory' },
      },
    },
  },
]

// ─── Tool execution ──────────────────────────────────────────────────────────

type ToolArgs = Record<string, unknown>

async function callTool(name: string, args: ToolArgs): Promise<unknown> {
  const cwd = typeof args.cwd === 'string' ? args.cwd : process.cwd()

  switch (name) {
    case 'bananajs_routes': {
      const root = typeof args.root === 'string' ? args.root : 'src'
      const output = await runCli(['routes', '--root', root], cwd)
      return { type: 'text', text: output }
    }

    case 'bananajs_explain': {
      if (!args.file) throw new Error('file is required')
      const output = await runCli(['ai', 'explain', args.file as string], cwd)
      return { type: 'text', text: output }
    }

    case 'bananajs_review': {
      const cliArgs = ['ai', 'review', '--format', 'json']
      if (args.file) cliArgs.push('--file', args.file as string)
      else if (args.module) cliArgs.push('--module', args.module as string)
      else throw new Error('Provide file or module')
      const output = await runCli(cliArgs, cwd)
      const jsonStart = output.indexOf('{')
      if (jsonStart >= 0) {
        try {
          return JSON.parse(output.slice(jsonStart)) as unknown
        } catch {
          // fall through to text
        }
      }
      return { type: 'text', text: output }
    }

    case 'bananajs_plan_module': {
      if (!args.description) throw new Error('description is required')
      const output = await runCli(
        ['ai', 'generate', '--module', args.description as string, '--plan-only'],
        cwd,
      )
      // The plan-only mode writes JSON to stdout; parse and return it as structured data.
      const jsonStart = output.indexOf('{')
      if (jsonStart >= 0) {
        try {
          const plan = JSON.parse(output.slice(jsonStart)) as unknown
          return plan
        } catch {
          // fall through to text
        }
      }
      return { type: 'text', text: output }
    }

    case 'bananajs_generate': {
      if (!args.description) throw new Error('description is required')
      const cliArgs = ['ai', 'generate', '--module', args.description as string]
      if (args.orm) cliArgs.push('--orm', args.orm as string)
      if (args.out) cliArgs.push('--out', args.out as string)
      if (args.context) cliArgs.push('--context', args.context as string)
      // In MCP mode default to dry-run only when no context is provided (safety guard)
      // When context is explicitly provided the caller has done HITL and wants real files.
      if (!args.context && (args.dryRun === true || args.dryRun === undefined)) {
        cliArgs.push('--dry-run')
      } else if (args.dryRun === true) {
        cliArgs.push('--dry-run')
      }
      const output = await runCli(cliArgs, cwd)
      return { type: 'text', text: output }
    }

    case 'bananajs_mock': {
      const cliArgs = ['ai', 'mock']
      if (args.schema) cliArgs.push('--schema', args.schema as string)
      else if (args.module) cliArgs.push('--module', args.module as string)
      else throw new Error('Provide schema or module')
      if (args.out) cliArgs.push('--out', args.out as string)
      cliArgs.push('--format', args.format as string ?? 'ts')
      if (args.dryRun !== false) cliArgs.push('--dry-run')
      const output = await runCli(cliArgs, cwd)
      return { type: 'text', text: output }
    }

    case 'bananajs_debug': {
      if (!args.input) throw new Error('input is required')
      const cliArgs = ['ai', 'debug', '--format', 'json', '--input', args.input as string]
      if (args.file) cliArgs.push('--file', args.file as string)
      const output = await runCli(cliArgs, cwd)
      const jsonStart = output.indexOf('{')
      if (jsonStart >= 0) {
        try {
          return JSON.parse(output.slice(jsonStart)) as unknown
        } catch {
          // fall through
        }
      }
      return { type: 'text', text: output }
    }

    case 'bananajs_perf': {
      const cliArgs = ['ai', 'perf', '--format', 'json']
      if (args.file) cliArgs.push('--file', args.file as string)
      else if (args.module) cliArgs.push('--module', args.module as string)
      else throw new Error('Provide file or module')
      const output = await runCli(cliArgs, cwd)
      const jsonStart = output.indexOf('{')
      if (jsonStart >= 0) {
        try {
          return JSON.parse(output.slice(jsonStart)) as unknown
        } catch {
          // fall through
        }
      }
      return { type: 'text', text: output }
    }

    case 'bananajs_upgrade': {
      // --apply is intentionally NOT exposed via MCP (security guardrail)
      const cliArgs = ['ai', 'upgrade', '--dry-run']
      if (args.to) cliArgs.push('--to', args.to as string)
      const output = await runCli(cliArgs, cwd)
      return { type: 'text', text: output }
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// ─── MCP request dispatcher ──────────────────────────────────────────────────

async function handleRequest(req: JsonRpcRequest): Promise<void> {
  const id = req.id ?? null

  switch (req.method) {
    case 'initialize': {
      const params = req.params as { protocolVersion?: string; clientInfo?: unknown } | undefined
      ok(id, {
        protocolVersion: params?.protocolVersion ?? '2024-11-05',
        serverInfo: { name: 'bananajs-mcp', version: '0.1.0' },
        capabilities: { tools: {} },
      })
      break
    }

    case 'initialized':
      // Notification — no response
      break

    case 'tools/list':
      ok(id, { tools: TOOLS })
      break

    case 'tools/call': {
      const p = req.params as { name?: string; arguments?: ToolArgs } | undefined
      const toolName = p?.name
      const toolArgs: ToolArgs = p?.arguments ?? {}
      if (!toolName) {
        err(id, -32602, 'Missing tool name')
        return
      }
      if (!TOOLS.find((t) => t.name === toolName)) {
        err(id, -32601, `Tool not found: ${toolName}`)
        return
      }
      try {
        const result = await callTool(toolName, toolArgs)
        ok(id, { content: [result] })
      } catch (e) {
        err(id, -32000, e instanceof Error ? e.message : String(e))
      }
      break
    }

    default:
      if (req.id !== undefined) {
        err(id, -32601, `Method not found: ${req.method}`)
      }
  }
}

// ─── Server entry point ──────────────────────────────────────────────────────

export async function startMcpServer(): Promise<void> {
  process.stderr.write('[bananajs-mcp] Server started on stdio\n')

  for await (const body of readFramedMessages(process.stdin)) {
    let req: JsonRpcRequest
    try {
      req = JSON.parse(body) as JsonRpcRequest
    } catch {
      err(null, -32700, 'Parse error')
      continue
    }
    await handleRequest(req).catch((e: unknown) => {
      process.stderr.write(`[bananajs-mcp] Unhandled error: ${String(e)}\n`)
    })
  }
}
