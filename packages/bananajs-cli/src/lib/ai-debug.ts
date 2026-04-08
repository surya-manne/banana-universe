import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import { loadBananarc } from './llm/bananarc.js'
import { resolveLlmProvider } from './llm/provider.factory.js'
import { tryParseJsonObject } from './llm/entity-extraction.js'
import { buildAiDebugJsonSystem } from './llm/prompts/debug.js'
import { parseAiDebugJson, type AiDebugJson } from './ai-debug-schema.js'
import { listRoutes as _listRoutes } from './routes.js'
import { type BaseCtx, type LlmOperation, LlmOperationError, runLlmOperation } from './llm/pipeline.js'

export interface AiDebugOptions {
  /** Stdin or file path containing the stack trace / error message. */
  input?: string
  /** Path to a file; its content is appended as source context. */
  file?: string
  /** Output format: text (default) or json. */
  format?: 'text' | 'json'
  /** Print raw LLM output for debugging. */
  debug?: boolean
  cwd?: string
}

const SEV_ICON: Record<string, string> = { error: '✖', warn: '⚠', info: 'ℹ' }

function sevColor(s: string) {
  return s === 'error' ? chalk.red : s === 'warn' ? chalk.yellow : chalk.cyan
}

/** Discover route/module names from src/ for injecting into the debug prompt. */
async function buildModuleTreeString(cwd: string): Promise<string> {
  const srcDir = path.join(cwd, 'src', 'modules')
  try {
    const entries = await fs.readdir(srcDir, { withFileTypes: true })
    const names = entries.filter((e) => e.isDirectory()).map((e) => e.name)
    return names.length > 0 ? names.map((n) => `  - src/modules/${n}/`).join('\n') : ''
  } catch {
    return ''
  }
}

/** Read stack trace from stdin (piped) or from the --input file path. */
async function readStackTrace(input: string | undefined, cwd: string): Promise<string> {
  // If --input points to an existing file, read it
  if (input) {
    const abs = path.resolve(cwd, input)
    const st = await fs.stat(abs).catch(() => null)
    if (st?.isFile()) {
      return fs.readFile(abs, 'utf-8')
    }
    // Treat as inline text
    return input
  }

  // If stdin is piped, read from it
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = []
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer)
    }
    return Buffer.concat(chunks).toString('utf-8')
  }

  return ''
}

function renderTextOutput(result: AiDebugJson): void {
  const color = sevColor(result.severity)
  const icon = SEV_ICON[result.severity] ?? '·'
  console.log(chalk.bold.blue('\nAI Debug Analysis'))
  console.log(chalk.gray('─'.repeat(60)))
  console.log(color(`${icon} [${result.severity}] ${result.error}`))
  console.log('')
  console.log(chalk.bold('Root Cause:'))
  console.log(`  ${result.rootCause}`)
  if (result.location?.file || result.location?.hint) {
    console.log('')
    console.log(chalk.bold('Location:'))
    if (result.location.file) console.log(`  File:  ${chalk.cyan(result.location.file)}`)
    if (result.location.hint) console.log(`  Hint:  ${result.location.hint}`)
  }
  console.log('')
  console.log(chalk.bold('Fix:'))
  const fixLines = result.fix.split('\n')
  for (const line of fixLines) {
    console.log(`  ${line}`)
  }
  console.log(chalk.gray('─'.repeat(60)))
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface DebugCtx extends BaseCtx {
  cwd: string
  format: 'text' | 'json'
  stackTrace: string
  sourceContext: string
  moduleTreeString: string
  systemPrompt: string
  userPrompt: string
  rawOutput: string
  result: AiDebugJson | null
}

// ─── Operation ────────────────────────────────────────────────────────────────

const debugOperation: LlmOperation<AiDebugOptions, DebugCtx, void> = {
  name: 'ai-debug',

  // Prepare: validate there is input, load config, resolve provider
  async prepare(opts) {
    const cwd = opts.cwd ?? process.cwd()
    const stackTrace = await readStackTrace(opts.input, cwd)
    if (!stackTrace.trim()) {
      throw new Error(
        'No stack trace provided. Pipe stderr/stdout to stdin, pass --input <file>, or provide an inline error string.',
      )
    }
    const config = await loadBananarc(cwd)
    const provider = resolveLlmProvider(config)
    return {
      cwd,
      format: opts.format ?? 'text',
      stackTrace: stackTrace.trim(),
      sourceContext: '',
      moduleTreeString: '',
      systemPrompt: '',
      userPrompt: '',
      rawOutput: '',
      result: null,
      provider,
      providerAvailable: true,
      debug: opts.debug ?? false,
    }
  },

  // Research: build module tree and attach optional source file context
  async research(ctx) {
    ctx.moduleTreeString = await buildModuleTreeString(ctx.cwd)
    return ctx
  },

  // Plan: build debug system prompt and user prompt
  async plan(ctx) {
    ctx.systemPrompt = buildAiDebugJsonSystem(ctx.moduleTreeString)
    ctx.userPrompt = `Stack trace / error:\n\`\`\`\n${ctx.stackTrace}\n\`\`\`` + ctx.sourceContext
    return ctx
  },

  // Act: single LLM call
  async act(ctx) {
    ctx.rawOutput = await ctx.provider.generate(ctx.userPrompt, {
      system: ctx.systemPrompt,
      temperature: 0.1,
    })
    if (ctx.debug) {
      console.log(chalk.dim('\n[debug] raw LLM output:'))
      console.log(chalk.dim(ctx.rawOutput))
      console.log('')
    }
    return ctx
  },

  // Validate: parse structured JSON, render output
  async validate(ctx) {
    let result: AiDebugJson
    try {
      result = parseAiDebugJson(tryParseJsonObject(ctx.rawOutput))
    } catch {
      throw new Error(
        'Failed to parse structured debug output. Use --debug to see raw LLM response.' +
          (ctx.debug ? '' : `\n${ctx.rawOutput.slice(0, 500)}`),
      )
    }

    if (ctx.format === 'json') {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n')
      return
    }
    renderTextOutput(result)
  },
}

// ─── Public entry ─────────────────────────────────────────────────────────────

export async function runAiDebug(opts: AiDebugOptions): Promise<void> {
  // Source-file attachment is built outside the pipeline since it involves
  // optional file I/O that populates the stack trace context before research.
  const cwd = opts.cwd ?? process.cwd()
  let sourceContext = ''
  if (opts.file) {
    const absFile = path.resolve(cwd, opts.file)
    const content = await fs.readFile(absFile, 'utf-8').catch(() => null)
    if (content) {
      sourceContext = `\n\n// Referenced source file: ${path.relative(cwd, absFile)}\n${content}`
    }
  }

  try {
    await runLlmOperation(
      {
        ...debugOperation,
        // Inject source context into the ctx built by prepare
        async prepare(o) {
          const ctx = await debugOperation.prepare(o)
          ctx.sourceContext = sourceContext
          return ctx
        },
      },
      opts,
      opts.debug,
    )
  } catch (e) {
    if (e instanceof LlmOperationError) {
      console.error(chalk.red(`ai debug failed [${e.stage}]: ${e.cause.message}`))
    } else {
      console.error(chalk.red('LLM request failed:'), e instanceof Error ? e.message : String(e))
    }
    process.exit(1)
  }
}
