import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import { loadBananarc } from './llm/bananarc.js'
import { resolveLlmProvider } from './llm/provider.factory.js'
import { tryParseJsonObject } from './llm/entity-extraction.js'
import { buildAiPerfJsonSystem } from './llm/prompts/perf.js'
import {
  parseAiReviewJson,
  type AiReviewJson,
  type AiReviewFinding,
  AI_REVIEW_JSON_SCHEMA_VERSION,
} from './ai-review-schema.js'

export interface AiPerfOptions {
  file?: string
  module?: string
  format?: 'text' | 'json'
  debug?: boolean
  cwd?: string
}

// ─── Static AST checks (no LLM required) ─────────────────────────────────────

export interface StaticPerfFinding {
  severity: 'error' | 'warn' | 'info'
  message: string
  file: string
  line: number | null
}

/** Regex-based patterns — fast, zero LLM cost, usable in CI without a configured provider. */
const STATIC_PATTERNS: Array<{
  severity: 'error' | 'warn' | 'info'
  re: RegExp
  message: (match: RegExpExecArray) => string
}> = [
  // N+1: ORM calls inside loops
  {
    severity: 'error',
    re: /\.(forEach|map|filter)\s*\([^)]*=>\s*\{[^}]*(?:findOne|findById|findOneBy|find|findAll|exec|query)\s*\(/gms,
    message: () =>
      'N+1 risk: repository/ORM call inside .forEach/.map — batch with a single query or eager relations instead',
  },
  {
    severity: 'error',
    re: /for\s*(?:const|let|var)\s+\w+\s+of\s+\w+[^{]*\{[^}]*(?:findOne|findById|findOneBy|findAll|exec|query)\s*\(/gms,
    message: () =>
      'N+1 risk: repository/ORM call inside for-of loop — use a batch query outside the loop',
  },
  // Unbounded find — missing take/limit
  {
    severity: 'warn',
    re: /\bfindAll\s*\(\s*\)/g,
    message: () =>
      'Unbounded findAll() with no take/limit — add PaginationQuerySchema to cap result sets',
  },
  // Missing @Cache on GET route (heuristic: @Get decorator but no @Cache nearby)
  {
    severity: 'warn',
    re: /@Get\s*\([^)]*\)[\s\S]{0,400}(?!@Cache)/,
    message: () =>
      '@Get route has no @Cache decorator — if data is stable, add @Cache({ ttl }) to avoid redundant DB reads',
  },
  // Mongoose missing .lean()
  {
    severity: 'warn',
    re: /\.find\s*\([^)]*\)\s*(?:\.sort|\.limit|\.skip|\.populate|\.select|\.where)?(?!\s*\.lean\s*\()/g,
    message: () =>
      'Mongoose find() without .lean() — add .lean() for read-only queries to return plain JS objects (significant perf gain)',
  },
  // JSON.stringify / JSON.parse in hot path
  {
    severity: 'info',
    re: /JSON\.(stringify|parse)\s*\([^)]*\)/g,
    message: (m) =>
      `JSON.${m[1]}() detected in request handler — ensure it is not called per-request on static data; pre-compute and cache if so`,
  },
]

function runStaticChecks(src: string, filePath: string): StaticPerfFinding[] {
  const findings: StaticPerfFinding[] = []
  const lines = src.split('\n')

  for (const pat of STATIC_PATTERNS) {
    const re = new RegExp(pat.re.source, pat.re.flags.includes('g') ? pat.re.flags : pat.re.flags + 'g')
    let m: RegExpExecArray | null
    while ((m = re.exec(src)) !== null) {
      // Compute 1-based line number from match index
      const lineNum = src.slice(0, m.index).split('\n').length
      findings.push({
        severity: pat.severity,
        message: pat.message(m),
        file: filePath,
        line: lineNum <= lines.length ? lineNum : null,
      })
      // Prevent catastrophic backtracking on non-global regex (already guarded above)
      if (!pat.re.flags.includes('g')) break
    }
  }

  return findings
}

// ─── File collection helpers ──────────────────────────────────────────────────

async function collectTsFiles(dirOrFile: string): Promise<string[]> {
  const st = await fs.stat(dirOrFile).catch(() => null)
  if (!st) return []
  if (st.isFile()) return [dirOrFile]

  const out: string[] = []
  const recurse = async (dir: string): Promise<void> => {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
        await recurse(full)
      } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
        out.push(full)
      }
    }
  }
  await recurse(dirOrFile)
  return out
}

// ─── Rendering helpers ────────────────────────────────────────────────────────

const SEV_ICON: Record<string, string> = { error: '✖', warn: '⚠', info: 'ℹ' }
const SEV_ORDER: Record<string, number> = { error: 0, warn: 1, info: 2 }
const BAR = chalk.gray('─'.repeat(60))

function sevColor(s: string) {
  return s === 'error' ? chalk.red : s === 'warn' ? chalk.yellow : chalk.cyan
}

function renderPerfOutput(review: AiReviewJson, scope: string, staticCount: number): void {
  console.log(chalk.bold.blue(`\nAI Perf Analysis: ${scope}`))
  console.log(
    chalk.dim(
      `  schema ${review.schemaVersion}  ·  ${review.findings.length} finding${review.findings.length !== 1 ? 's' : ''} (${staticCount} static)`,
    ),
  )
  console.log(chalk.bold('\nSummary: ') + review.summary)
  console.log('')

  if (review.findings.length === 0) {
    console.log(chalk.green('  ✔ No performance issues found.'))
    return
  }

  const groups = new Map<string | null, AiReviewFinding[]>()
  for (const f of review.findings) {
    const key = f.file ?? null
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(f)
  }
  for (const [, arr] of groups) {
    arr.sort((a, b) => (SEV_ORDER[a.severity] ?? 2) - (SEV_ORDER[b.severity] ?? 2))
  }

  const fileKeys = [...groups.keys()].filter((k): k is string => k !== null)
  const renderOrder: Array<string | null> = [...fileKeys, ...(groups.has(null) ? [null] : [])]

  for (const key of renderOrder) {
    const findings = groups.get(key)!
    console.log(BAR)
    console.log(chalk.bold.white(` ${key ?? '(general)'}`))
    console.log(BAR)
    for (const f of findings) {
      const color = sevColor(f.severity)
      const icon = SEV_ICON[f.severity] ?? '·'
      const location = f.line != null ? chalk.dim(` @@ line ${f.line}`) : ''
      console.log(color(`  ${icon} [${f.severity}]`) + location)
      console.log(`     ${f.message}`)
      console.log('')
    }
  }
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export async function runAiPerf(opts: AiPerfOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd()

  // Resolve target
  let targetPath: string | null = null
  if (opts.file) {
    targetPath = path.resolve(cwd, opts.file)
  } else if (opts.module) {
    const direct = path.resolve(cwd, opts.module)
    const st = await fs.stat(direct).catch(() => null)
    if (st?.isDirectory()) {
      targetPath = direct
    } else {
      // bare module name → src/modules/<name>
      const underModules = path.join(cwd, 'src', 'modules', opts.module)
      const st2 = await fs.stat(underModules).catch(() => null)
      if (st2?.isDirectory()) {
        targetPath = underModules
      }
    }
  }

  if (!targetPath) {
    console.error(
      chalk.red('Pass --file <path> or --module <name> to specify a target for perf analysis.'),
    )
    process.exit(1)
  }

  const files = await collectTsFiles(targetPath)
  if (files.length === 0) {
    console.error(chalk.yellow(`No TypeScript files found at: ${targetPath}`))
    process.exit(1)
  }

  const scope = path.relative(cwd, targetPath) || path.basename(targetPath)
  const combined = (
    await Promise.all(
      files.map(async (f) => {
        const src = await fs.readFile(f, 'utf-8').catch(() => '')
        return `// ${path.relative(cwd, f)}\n${src}`
      }),
    )
  ).join('\n\n')

  // ── Phase 1: static checks (no LLM) ─────────────────────────────────────
  const staticFindings: StaticPerfFinding[] = []
  for (const f of files) {
    const src = await fs.readFile(f, 'utf-8').catch(() => '')
    const relPath = path.relative(cwd, f)
    staticFindings.push(...runStaticChecks(src, relPath))
  }

  // ── Phase 2: LLM enrichment ───────────────────────────────────────────────
  let llmFindings: AiReviewFinding[] = []
  let llmSummary = ''
  try {
    const config = await loadBananarc(cwd)
    const provider = resolveLlmProvider(config)
    const raw = await provider.generate(combined, {
      system: buildAiPerfJsonSystem(),
      temperature: 0.1,
    })

    if (opts.debug) {
      console.log(chalk.dim('\n[debug] raw LLM output:'))
      console.log(chalk.dim(raw))
      console.log('')
    }

    const parsed = parseAiReviewJson(tryParseJsonObject(raw))
    llmFindings = parsed.findings
    llmSummary = parsed.summary
  } catch (err) {
    // LLM step is optional — static results still useful
    if (opts.debug) {
      console.log(chalk.dim(`\n[debug] LLM step skipped: ${String(err)}`))
    }
  }

  // Merge: static findings first, then LLM-unique (deduplicate by message)
  const staticAsReview: AiReviewFinding[] = staticFindings.map((sf) => ({
    severity: sf.severity,
    message: sf.message,
    file: sf.file,
    line: sf.line,
  }))

  const allMessages = new Set(staticAsReview.map((f) => f.message.slice(0, 60)))
  const uniqueLlm = llmFindings.filter((f) => !allMessages.has(f.message.slice(0, 60)))
  const allFindings = [...staticAsReview, ...uniqueLlm]

  const result: AiReviewJson = {
    schemaVersion: AI_REVIEW_JSON_SCHEMA_VERSION,
    summary:
      llmSummary ||
      (allFindings.length === 0
        ? 'No performance issues found.'
        : `Found ${allFindings.length} performance finding${allFindings.length !== 1 ? 's' : ''}.`),
    findings: allFindings,
  }

  if (opts.format === 'json') {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    return
  }

  renderPerfOutput(result, scope, staticFindings.length)
}
