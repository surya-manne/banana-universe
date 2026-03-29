import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import { tryParseJsonObject } from './llm/entity-extraction.js'
import { loadBananarc } from './llm/bananarc.js'
import { resolveLlmProvider } from './llm/provider.factory.js'
import { buildAiReviewJsonSystem } from './llm/prompts/review-json.js'
import {
  AI_REVIEW_JSON_SCHEMA_VERSION,
  parseAiReviewJson,
  type AiReviewJson,
} from './ai-review-schema.js'
import { findingsToSarif } from './ai-review-sarif.js'

export interface AiReviewCliOptions {
  file?: string
  module?: string
  format?: 'text' | 'json'
  sarif?: boolean
  fix?: boolean
  dryRun?: boolean
}

async function collectTsFilesUnder(dir: string): Promise<string[]> {
  const out: string[] = []
  let entries: Awaited<ReturnType<typeof fs.readdir>>
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist') continue
      out.push(...(await collectTsFilesUnder(full)))
    } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
      out.push(full)
    }
  }
  return out
}

function buildReviewPayload(files: Array<{ path: string; content: string }>): string {
  return files
    .map((f) => `// FILE: ${f.path}\n${f.content}`)
    .join('\n\n// ---\n\n')
}

export async function runAiReview(opts: AiReviewCliOptions): Promise<void> {
  let filesToRead: Array<{ path: string; abs: string }> = []

  if (opts.module) {
    const modDir = path.resolve(process.cwd(), opts.module)
    const stat = await fs.stat(modDir).catch(() => null)
    if (!stat?.isDirectory()) {
      console.error(chalk.red(`Not a directory: ${modDir}`))
      process.exit(1)
    }
    const ts = await collectTsFilesUnder(modDir)
    if (ts.length === 0) {
      console.error(chalk.red(`No .ts files under ${modDir}`))
      process.exit(1)
    }
    filesToRead = ts.map((abs) => ({ path: path.relative(process.cwd(), abs), abs }))
  } else if (opts.file) {
    filesToRead = [{ path: opts.file, abs: path.resolve(process.cwd(), opts.file) }]
  } else {
    console.error(chalk.red('Specify --file <path> or --module <dir> to review.'))
    process.exit(1)
  }

  const parts: Array<{ path: string; content: string }> = []
  for (const f of filesToRead) {
    let content: string
    try {
      content = await fs.readFile(f.abs, 'utf-8')
    } catch {
      console.error(chalk.red(`File not found: ${f.abs}`))
      process.exit(1)
    }
    parts.push({ path: f.path, content })
  }

  const cwd = process.cwd()
  const config = await loadBananarc(cwd)
  const provider = resolveLlmProvider(config)

  const userPrompt = buildReviewPayload(parts)
  const system = buildAiReviewJsonSystem()

  let raw: string
  try {
    raw = await provider.generate(userPrompt, {
      system,
      temperature: 0.2,
    })
  } catch (err) {
    console.error(chalk.red('AI review failed:'), err)
    return
  }

  let parsedObj: unknown
  try {
    parsedObj = tryParseJsonObject(raw)
  } catch {
    console.error(chalk.red('Review output was not valid JSON. Raw output:\n'), raw)
    process.exit(1)
  }

  let review: AiReviewJson
  try {
    review = parseAiReviewJson(parsedObj)
  } catch (e) {
    console.error(chalk.red('Review JSON failed schema validation:'), e)
    console.error(chalk.gray(JSON.stringify(parsedObj, null, 2)))
    process.exit(1)
  }

  if (opts.sarif) {
    const sarif = findingsToSarif({
      findings: review.findings,
      toolName: 'bananajs-ai-review',
      runId: `run-${Date.now()}`,
    })
    console.log(JSON.stringify(sarif, null, 2))
    return
  }

  if (opts.format === 'json') {
    console.log(JSON.stringify(review, null, 2))
    return
  }

  const scope =
    filesToRead.length === 1 ? filesToRead[0].path : `${opts.module ?? ''} (${filesToRead.length} files)`
  console.log(chalk.bold.blue(`\nAI Review: ${scope}\n`))
  console.log(chalk.yellow(`schemaVersion: ${review.schemaVersion} (CLI expects ${AI_REVIEW_JSON_SCHEMA_VERSION})`))
  console.log(chalk.bold('Summary:'), review.summary)
  console.log('')
  for (const f of review.findings) {
    const tag =
      f.severity === 'error' ? chalk.red : f.severity === 'warn' ? chalk.yellow : chalk.gray
    console.log(tag(`[${f.severity}]`), f.message, f.file ? chalk.gray(`(${f.file}${f.line ? `:${f.line}` : ''})`) : '')
  }

  if (opts.fix) {
    console.log(
      chalk.cyan(
        '[--fix] Safe auto-fix is not applied automatically. Review findings above; ambiguous changes require a manual patch.',
      ),
    )
  }
}
