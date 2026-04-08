import * as fs from 'fs/promises'
import * as path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import chalk from 'chalk'
import { loadBananarc } from './llm/bananarc.js'
import { resolveLlmProvider } from './llm/provider.factory.js'
import { buildAiChangelogSystem } from './llm/prompts/changelog.js'
import { type BaseCtx, type LlmOperation, LlmOperationError, runLlmOperation } from './llm/pipeline.js'

const execFileAsync = promisify(execFile)

export interface AiChangelogOptions {
  /** Git ref range start (e.g. "v0.5.0", "abc1234"). Defaults to previous tag. */
  from?: string
  /** Git ref range end (e.g. "HEAD", "v0.6.0"). Defaults to HEAD. */
  to?: string
  /** OpenAPI spec snapshot BEFORE the range (for diff). */
  before?: string
  /** OpenAPI spec snapshot AFTER the range (for diff). */
  after?: string
  /** Output format: md (default) or json. */
  format?: 'md' | 'json'
  /** Output file path. When omitted, prints to stdout. */
  out?: string
  /** Print raw LLM output. */
  debug?: boolean
  cwd?: string
}

export interface ChangelogEntry {
  section: string
  bullets: string[]
}

export interface ChangelogJson {
  version: string
  date: string
  sections: ChangelogEntry[]
}

// ─── Git helpers ──────────────────────────────────────────────────────────────

async function getGitLog(from: string | undefined, to: string, cwd: string): Promise<string> {
  const range = from ? `${from}..${to}` : to
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['log', '--oneline', '--no-merges', '--pretty=format:%s (%h)', range],
      { cwd },
    )
    return stdout.trim()
  } catch (err) {
    throw new Error(
      `git log failed: ${err instanceof Error ? err.message : String(err)}. Ensure you are in a git repository.`,
    )
  }
}

async function resolveDefaultFrom(cwd: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['describe', '--tags', '--abbrev=0', 'HEAD^'],
      { cwd },
    )
    return stdout.trim() || undefined
  } catch {
    return undefined
  }
}

// ─── OpenAPI diff helpers ─────────────────────────────────────────────────────

interface OpenApiSpec {
  paths?: Record<string, unknown>
  components?: { schemas?: Record<string, unknown> }
  info?: { version?: string }
}

function buildOpenApiDiffSummary(before: OpenApiSpec, after: OpenApiSpec): string {
  const beforePaths = new Set(Object.keys(before.paths ?? {}))
  const afterPaths = new Set(Object.keys(after.paths ?? {}))

  const removed = [...beforePaths].filter((p) => !afterPaths.has(p))
  const added = [...afterPaths].filter((p) => !beforePaths.has(p))

  const beforeSchemas = new Set(Object.keys(before.components?.schemas ?? {}))
  const afterSchemas = new Set(Object.keys(after.components?.schemas ?? {}))
  const addedSchemas = [...afterSchemas].filter((s) => !beforeSchemas.has(s))
  const removedSchemas = [...beforeSchemas].filter((s) => !afterSchemas.has(s))

  const lines: string[] = ['OpenAPI diff:']
  if (removed.length > 0) lines.push(`  Removed paths: ${removed.join(', ')}`)
  if (added.length > 0) lines.push(`  New paths: ${added.join(', ')}`)
  if (addedSchemas.length > 0) lines.push(`  New schemas: ${addedSchemas.join(', ')}`)
  if (removedSchemas.length > 0) lines.push(`  Removed schemas: ${removedSchemas.join(', ')}`)
  if (lines.length === 1) lines.push('  No path or schema changes detected')

  return lines.join('\n')
}

// ─── Output parsing helpers ───────────────────────────────────────────────────

function stripMarkdownFence(text: string): string {
  const stripped = text.trim()
  const fence = stripped.match(/^```(?:markdown|md)?\n?([\s\S]*?)```\s*$/)
  return fence ? fence[1].trim() : stripped
}

function markdownToJson(md: string, from: string | undefined, to: string): ChangelogJson {
  const sectionRe = /^###\s+(.+)$/gm
  const sections: ChangelogEntry[] = []
  let versionLine = ''

  const firstLine = md.split('\n')[0] ?? ''
  const versionMatch = firstLine.match(/^##\s+(.+)/)
  if (versionMatch) versionLine = versionMatch[1]

  const matches: Array<{ name: string; start: number }> = []
  let m: RegExpExecArray | null
  while ((m = sectionRe.exec(md)) !== null) {
    matches.push({ name: m[1], start: m.index })
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const next = matches[i + 1]
    const sectionText = md.slice(
      current.start + current.name.length + 5, // "### " prefix + newline
      next ? next.start : md.length,
    )
    const bullets = sectionText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('- ') || l.startsWith('* '))
      .map((l) => l.replace(/^[-*]\s+/, ''))
    if (bullets.length > 0) {
      sections.push({ section: current.name, bullets })
    }
  }

  return {
    version: versionLine || `${from ?? 'prev'}..${to}`,
    date: new Date().toISOString().slice(0, 10),
    sections,
  }
}

// ─── Main entry ───────────────────────────────────────────────────────────────

interface ChangelogCtx extends BaseCtx {
  cwd: string
  fromRef: string | undefined
  toRef: string
  gitLog: string
  openApiDiff: string
  hasOpenApiDiff: boolean
  systemPrompt: string
  userPrompt: string
  rawOutput: string
  markdownOutput: string
  opts: AiChangelogOptions
}

const changelogOperation: LlmOperation<AiChangelogOptions, ChangelogCtx, void> = {
  name: 'ai-changelog',

  // Prepare: resolve refs and provider
  async prepare(opts) {
    const cwd = opts.cwd ?? process.cwd()
    const toRef = opts.to ?? 'HEAD'
    let fromRef = opts.from
    if (!fromRef) {
      fromRef = await resolveDefaultFrom(cwd)
      if (fromRef) {
        console.log(chalk.dim(`\nUsing previous tag as range start: ${fromRef}`))
      }
    }
    const config = await loadBananarc(cwd)
    const provider = resolveLlmProvider(config)
    return {
      cwd,
      fromRef,
      toRef,
      gitLog: '',
      openApiDiff: '',
      hasOpenApiDiff: false,
      systemPrompt: '',
      userPrompt: '',
      rawOutput: '',
      markdownOutput: '',
      opts,
      provider,
      providerAvailable: true,
      debug: opts.debug ?? false,
    }
  },

  // Research: gather git log and optional OpenAPI diff
  async research(ctx) {
    ctx.gitLog = await getGitLog(ctx.fromRef, ctx.toRef, ctx.cwd)

    if (!ctx.gitLog.trim()) {
      // Signal empty — validate will short-circuit
      return ctx
    }

    if (ctx.opts.before && ctx.opts.after) {
      try {
        const [beforeRaw, afterRaw] = await Promise.all([
          fs.readFile(path.resolve(ctx.cwd, ctx.opts.before), 'utf-8'),
          fs.readFile(path.resolve(ctx.cwd, ctx.opts.after), 'utf-8'),
        ])
        const beforeSpec = JSON.parse(beforeRaw) as OpenApiSpec
        const afterSpec = JSON.parse(afterRaw) as OpenApiSpec
        ctx.openApiDiff = '\n\n' + buildOpenApiDiffSummary(beforeSpec, afterSpec)
        ctx.hasOpenApiDiff = true
      } catch (err) {
        console.warn(
          chalk.yellow(
            `Could not load OpenAPI specs: ${err instanceof Error ? err.message : String(err)}`,
          ),
        )
      }
    }

    return ctx
  },

  // Plan: build prompts
  async plan(ctx) {
    ctx.systemPrompt = buildAiChangelogSystem({ hasOpenApiDiff: ctx.hasOpenApiDiff })
    ctx.userPrompt =
      `Git commits (${ctx.fromRef ?? 'beginning'}..${ctx.toRef}):\n${ctx.gitLog}` +
      ctx.openApiDiff
    return ctx
  },

  // Act: single LLM call
  async act(ctx) {
    ctx.rawOutput = await ctx.provider.generate(ctx.userPrompt, {
      system: ctx.systemPrompt,
      temperature: 0.3,
    })
    return ctx
  },

  // Validate: parse and emit
  async validate(ctx) {
    if (!ctx.gitLog.trim()) {
      console.log(chalk.yellow('No commits found in the specified range.'))
      return
    }

    if (ctx.debug) {
      console.log(chalk.dim('\n[debug] raw LLM output:'))
      console.log(chalk.dim(ctx.rawOutput))
      console.log('')
    }

    ctx.markdownOutput = stripMarkdownFence(ctx.rawOutput)

    if (ctx.opts.format === 'json') {
      const json = markdownToJson(ctx.markdownOutput, ctx.fromRef, ctx.toRef)
      const output = JSON.stringify(json, null, 2)
      if (ctx.opts.out) {
        await fs.writeFile(path.resolve(ctx.cwd, ctx.opts.out), output, 'utf-8')
        console.log(chalk.green(`✔ Changelog JSON written to ${ctx.opts.out}`))
      } else {
        process.stdout.write(output + '\n')
      }
      return
    }

    if (ctx.opts.out) {
      await fs.writeFile(
        path.resolve(ctx.cwd, ctx.opts.out),
        ctx.markdownOutput + '\n',
        'utf-8',
      )
      console.log(chalk.green(`✔ Changelog written to ${ctx.opts.out}`))
    } else {
      process.stdout.write(ctx.markdownOutput + '\n')
    }
  },
}

export async function runAiChangelog(opts: AiChangelogOptions): Promise<void> {
  try {
    await runLlmOperation(changelogOperation, opts, opts.debug)
  } catch (e) {
    if (e instanceof LlmOperationError) {
      console.error(chalk.red(`ai changelog failed [${e.stage}]: ${e.cause.message}`))
    } else {
      console.error(
        chalk.red('ai changelog failed:'),
        e instanceof Error ? e.message : String(e),
      )
    }
    process.exit(1)
  }
}
