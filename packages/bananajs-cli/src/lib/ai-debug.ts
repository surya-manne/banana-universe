import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import { loadBananarc } from './llm/bananarc.js'
import { resolveLlmProvider } from './llm/provider.factory.js'
import { tryParseJsonObject } from './llm/entity-extraction.js'
import { buildAiDebugJsonSystem } from './llm/prompts/debug.js'
import { parseAiDebugJson, type AiDebugJson } from './ai-debug-schema.js'
import { listRoutes as _listRoutes } from './routes.js'

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

export async function runAiDebug(opts: AiDebugOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd()
  const config = await loadBananarc(cwd)

  const stackTrace = await readStackTrace(opts.input, cwd)
  if (!stackTrace.trim()) {
    console.error(
      chalk.red(
        'No stack trace provided. Pipe stderr/stdout to stdin, pass --input <file>, or provide an inline error string.',
      ),
    )
    process.exit(1)
  }

  // Attach optional reference file
  let sourceContext = ''
  if (opts.file) {
    const absFile = path.resolve(cwd, opts.file)
    const content = await fs.readFile(absFile, 'utf-8').catch(() => null)
    if (content) {
      sourceContext = `\n\n// Referenced source file: ${path.relative(cwd, absFile)}\n${content}`
    }
  }

  const moduleTree = await buildModuleTreeString(cwd)
  const provider = resolveLlmProvider(config)

  const prompt =
    `Stack trace / error:\n\`\`\`\n${stackTrace.trim()}\n\`\`\`` + sourceContext

  let raw: string
  try {
    raw = await provider.generate(prompt, {
      system: buildAiDebugJsonSystem(moduleTree),
      temperature: 0.1,
    })
  } catch (err) {
    console.error(chalk.red('LLM request failed:'), err instanceof Error ? err.message : String(err))
    process.exit(1)
  }

  if (opts.debug) {
    console.log(chalk.dim('\n[debug] raw LLM output:'))
    console.log(chalk.dim(raw))
    console.log('')
  }

  let result: AiDebugJson
  try {
    result = parseAiDebugJson(tryParseJsonObject(raw))
  } catch {
    console.error(chalk.red('Failed to parse structured debug output. Use --debug to see raw LLM response.'))
    if (!opts.debug) console.error(chalk.dim(raw.slice(0, 500)))
    process.exit(1)
  }

  if (opts.format === 'json') {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    return
  }

  renderTextOutput(result)
}
