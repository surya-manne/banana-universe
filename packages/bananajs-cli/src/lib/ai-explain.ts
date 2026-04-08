import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import { loadBananarc } from './llm/bananarc.js'
import { appendBananaJsAiRules } from './llm/bananajs-ai-rules.js'
import { resolveLlmProvider } from './llm/provider.factory.js'
import { type BaseCtx, type LlmOperation, LlmOperationError, runLlmOperation } from './llm/pipeline.js'

// ─── Context ──────────────────────────────────────────────────────────────────

interface ExplainCtx extends BaseCtx {
  cwd: string
  fileArg: string
  filePath: string
  fileContent: string
  systemPrompt: string
  userPrompt: string
  rawOutput: string
}

// ─── Operation ────────────────────────────────────────────────────────────────

interface ExplainOpts {
  file: string | undefined
  cwd?: string
}

const explainOperation: LlmOperation<ExplainOpts, ExplainCtx, void> = {
  name: 'ai-explain',

  // Prepare: validate file arg, resolve provider
  async prepare(opts) {
    if (!opts.file) {
      throw new Error('Specify a file path, e.g. `bananajs ai explain src/modules/foo/index.ts`')
    }
    const cwd = opts.cwd ?? process.cwd()
    const filePath = path.resolve(cwd, opts.file)
    const config = await loadBananarc(cwd)
    const provider = resolveLlmProvider(config)
    return {
      cwd,
      fileArg: opts.file,
      filePath,
      fileContent: '',
      systemPrompt: '',
      userPrompt: '',
      rawOutput: '',
      provider,
      providerAvailable: true,
      debug: false,
    }
  },

  // Research: read the target TypeScript file
  async research(ctx) {
    try {
      ctx.fileContent = await fs.readFile(ctx.filePath, 'utf-8')
    } catch {
      throw new Error(`File not found: ${ctx.filePath}`)
    }
    return ctx
  },

  // Plan: build system and user prompts
  async plan(ctx) {
    ctx.systemPrompt = appendBananaJsAiRules(
      'You are a BananaJS technical documentation assistant. Analyze this TypeScript module and produce a structured summary for a developer reading a PR or reviewing code.\n\n' +
      'Infer the architectural layer from the file path and state it in the Purpose line:\n' +
      '  \u2022 `domain/` \u2192 domain entity, value object, or repository port interface\n' +
      '  \u2022 `application/` \u2192 application service or use-case (orchestrates domain + ports)\n' +
      '  \u2022 `infrastructure/` or `persistence/` \u2192 repository adapter, ORM entity, or external integration\n' +
      '  \u2022 root `src/` or `modules/*/index` \u2192 HTTP controller or module bootstrap\n\n' +
      'Output format \u2014 use bold labels on their own line, then content. Renders cleanly in terminal without a markdown renderer:\n\n' +
      '**Purpose**: [layer] \u2014 one sentence describing what this file does\n' +
      '**Main exports**: list key classes, functions, or constants with one-line roles\n' +
      '**Routes / endpoints**: if a controller, list METHOD /path \u2014 brief description (omit this section if not a controller)\n' +
      '**Domain logic**: notable validation rules, business constraints, invariants, or error cases\n' +
      '**Dependencies**: injected services, repositories, plugins, or external integrations worth calling out\n' +
      '**Issues noticed**: any obvious bugs, missing error handling, security concerns, or BananaJS anti-patterns (omit this section if nothing warrants flagging)\n\n' +
      'Total: 6\u201312 lines of content. No code fences. No filler sentences. No markdown headings (##) \u2014 use the bold-label format above.',
    )
    ctx.userPrompt = `File: ${ctx.fileArg}\n\n${ctx.fileContent}`
    return ctx
  },

  // Act: single LLM call
  async act(ctx) {
    ctx.rawOutput = await ctx.provider.generate(ctx.userPrompt, {
      system: ctx.systemPrompt,
      temperature: 0.2,
    })
    return ctx
  },

  // Validate: print output to terminal
  async validate(ctx) {
    console.log(chalk.bold.blue(`\nExplain: ${ctx.fileArg}\n`))
    console.log(ctx.rawOutput)
  },
}

// ─── Public entry ─────────────────────────────────────────────────────────────

/** Short module/file summary for humans or PR descriptions (CLI-only; not IDE-specific). */
export async function runAiExplain(fileArg: string | undefined): Promise<void> {
  try {
    await runLlmOperation(explainOperation, { file: fileArg, cwd: process.cwd() })
  } catch (e) {
    if (e instanceof LlmOperationError) {
      console.error(chalk.red(`ai explain failed [${e.stage}]: ${e.cause.message}`))
    } else {
      console.error(chalk.red('ai explain failed:'), e instanceof Error ? e.message : String(e))
    }
    process.exit(1)
  }
}
