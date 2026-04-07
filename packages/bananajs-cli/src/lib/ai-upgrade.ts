import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import { UPGRADE_MANIFEST, SAFE_APPLY_IDS, type UpgradePattern } from './ai-upgrade-manifest.js'
import { loadBananarc } from './llm/bananarc.js'
import { resolveLlmProvider } from './llm/provider.factory.js'
import { appendBananaJsAiRules } from './llm/bananajs-ai-rules.js'

export interface AiUpgradeOptions {
  /** Target BananaJS version (e.g. "0.6.0"). When omitted, checks all known patterns. */
  to?: string
  /** Apply safe mechanical fixes to files in-place. Requires explicit --apply flag. */
  apply?: boolean
  /** Output directory for generated .patch files. */
  out?: string
  /** Dry-run: print findings without modifying any file. */
  dryRun?: boolean
  /** Print raw LLM output for ambiguous findings. */
  debug?: boolean
  cwd?: string
}

export interface UpgradeFinding {
  patternId: string
  description: string
  file: string
  line: number
  snippet: string
  safeApply: boolean
  docsRef: string
}

export interface UpgradeReport {
  totalFiles: number
  findings: UpgradeFinding[]
  appliedCount: number
  patchFiles: string[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function collectTsFiles(cwd: string): Promise<string[]> {
  const src = path.join(cwd, 'src')
  const out: string[] = []
  const recurse = async (dir: string): Promise<void> => {
    type FsDirent = { name: string; isDirectory(): boolean; isFile(): boolean }
    const entries = await (fs.readdir(dir, { withFileTypes: true }) as Promise<FsDirent[]>).catch(() => [] as FsDirent[])
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
        await recurse(full)
      } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
        out.push(full)
      }
    }
  }
  await recurse(src)
  return out
}

function filterPatternsForVersion(to: string | undefined): UpgradePattern[] {
  if (!to) return UPGRADE_MANIFEST
  // Simple semver: include patterns whose sinceVersion the target satisfies
  // e.g. pattern sinceVersion ">=0.5.0" → include when target >= 0.5.0
  return UPGRADE_MANIFEST.filter((p) => {
    const versionMatch = p.sinceVersion.match(/>=(\d+\.\d+\.\d+)/)
    if (!versionMatch) return true
    return compareVersions(to, versionMatch[1]) >= 0
  })
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

function scanFile(
  src: string,
  filePath: string,
  patterns: UpgradePattern[],
): UpgradeFinding[] {
  const lines = src.split('\n')
  const findings: UpgradeFinding[] = []

  for (const pat of patterns) {
    const re = new RegExp(
      pat.detect.source,
      pat.detect.flags.includes('g') ? pat.detect.flags : pat.detect.flags + 'g',
    )
    let m: RegExpExecArray | null
    while ((m = re.exec(src)) !== null) {
      const lineNum = src.slice(0, m.index).split('\n').length
      const snippet = lines[lineNum - 1]?.trim().slice(0, 120) ?? ''
      findings.push({
        patternId: pat.id,
        description: pat.description,
        file: filePath,
        line: lineNum,
        snippet,
        safeApply: SAFE_APPLY_IDS.has(pat.id),
        docsRef: pat.docsRef,
      })
      if (!pat.detect.flags.includes('g')) break
    }
  }

  return findings
}

async function applyPatterns(
  src: string,
  patterns: UpgradePattern[],
): Promise<{ modified: string; count: number }> {
  let modified = src
  let count = 0
  for (const pat of patterns) {
    if (!pat.safeFix) continue
    const before = modified
    modified = pat.safeFix(modified)
    if (modified !== before) count++
  }
  return { modified, count }
}

function minimalUnifiedDiff(original: string, modified: string, filePath: string): string {
  const origLines = original.split('\n')
  const modLines = modified.split('\n')
  const lines: string[] = [
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
  ]
  const maxLen = Math.max(origLines.length, modLines.length)
  for (let i = 0; i < maxLen; i++) {
    const o = origLines[i]
    const m = modLines[i]
    if (o === m) {
      lines.push(` ${o ?? ''}`)
    } else {
      if (o !== undefined) lines.push(`-${o}`)
      if (m !== undefined) lines.push(`+${m}`)
    }
  }
  return lines.join('\n')
}

function renderReport(report: UpgradeReport, cwd: string): void {
  const BAR = chalk.gray('─'.repeat(60))
  console.log(chalk.bold.blue('\nAI Upgrade Report'))
  console.log(
    chalk.dim(
      `  scanned ${report.totalFiles} file${report.totalFiles !== 1 ? 's' : ''}  ·  ${report.findings.length} finding${report.findings.length !== 1 ? 's' : ''}`,
    ),
  )

  if (report.findings.length === 0) {
    console.log(chalk.green('\n  ✔ No deprecated patterns found.'))
    return
  }

  const byFile = new Map<string, UpgradeFinding[]>()
  for (const f of report.findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, [])
    byFile.get(f.file)!.push(f)
  }

  for (const [file, findings] of byFile) {
    console.log('\n' + BAR)
    console.log(chalk.bold.white(` ${file}`))
    console.log(BAR)
    for (const f of findings) {
      const safeLabel = f.safeApply ? chalk.green(' [safe-apply]') : chalk.yellow(' [manual]')
      console.log(chalk.red(`  ✖ [${f.patternId}]`) + safeLabel)
      console.log(`     ${f.description}`)
      console.log(chalk.dim(`     line ${f.line}: ${f.snippet}`))
      console.log(chalk.dim(`     See: ${f.docsRef}`))
      console.log('')
    }
  }

  console.log(BAR)
  const safeCount = report.findings.filter((f) => f.safeApply).length
  const manualCount = report.findings.length - safeCount
  if (safeCount > 0) {
    console.log(chalk.green(`  ${safeCount} safe-apply finding${safeCount !== 1 ? 's' : ''}`), chalk.dim('— run with --apply to fix automatically'))
  }
  if (manualCount > 0) {
    console.log(chalk.yellow(`  ${manualCount} manual finding${manualCount !== 1 ? 's' : ''}`), chalk.dim('— requires LLM-assisted or manual migration'))
  }
  if (report.appliedCount > 0) {
    console.log(chalk.bold.green(`\n  Applied ${report.appliedCount} safe mechanical fix${report.appliedCount !== 1 ? 'es' : ''}.`))
  }
  if (report.patchFiles.length > 0) {
    console.log(chalk.dim(`\n  Patch files written: ${report.patchFiles.map((p) => path.relative(cwd, p)).join(', ')}`))
  }
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export async function runAiUpgrade(opts: AiUpgradeOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd()
  const patterns = filterPatternsForVersion(opts.to)

  if (opts.to) {
    console.log(chalk.dim(`\nScanning for patterns deprecated in BananaJS ≥ ${opts.to}...\n`))
  } else {
    console.log(chalk.dim('\nScanning for all known deprecated patterns...\n'))
  }

  const files = await collectTsFiles(cwd)
  if (files.length === 0) {
    console.log(chalk.yellow('No TypeScript source files found under src/. Run from a BananaJS project root.'))
    return
  }

  const allFindings: UpgradeFinding[] = []
  let appliedCount = 0
  const patchFiles: string[] = []

  for (const absFile of files) {
    const relFile = path.relative(cwd, absFile)
    const src = await fs.readFile(absFile, 'utf-8').catch(() => '')
    if (!src) continue

    const findings = scanFile(src, relFile, patterns)
    allFindings.push(...findings)

    if (findings.length === 0 || opts.dryRun) continue

    if (opts.apply) {
      // Apply only safe mechanical transforms
      const safePatterns = patterns.filter((p) => p.safeFix)
      const { modified, count } = await applyPatterns(src, safePatterns)
      if (count > 0) {
        await fs.writeFile(absFile, modified, 'utf-8')
        appliedCount += count
      }
    } else if (opts.out) {
      // Emit patch files for safe transforms
      const safePatterns = patterns.filter((p) => p.safeFix)
      const { modified } = await applyPatterns(src, safePatterns)
      if (modified !== src) {
        const diff = minimalUnifiedDiff(src, modified, relFile)
        const patchName = relFile.replace(/\//g, '__').replace(/\.ts$/, '.patch')
        const outDir = path.resolve(cwd, opts.out)
        await fs.mkdir(outDir, { recursive: true })
        const patchPath = path.join(outDir, patchName)
        await fs.writeFile(patchPath, diff, 'utf-8')
        patchFiles.push(patchPath)
      }
    }
  }

  // LLM pass for manual findings (ambiguous transforms)
  const manualFindings = allFindings.filter((f) => !f.safeApply)
  if (manualFindings.length > 0 && !opts.dryRun) {
    try {
      const config = await loadBananarc(cwd)
      const provider = resolveLlmProvider(config)
      // Build a concise prompt listing manual findings and asking for guidance
      const manualList = manualFindings
        .slice(0, 10) // cap to avoid token overflow
        .map((f) => `- ${f.file}:${f.line} [${f.patternId}]: ${f.snippet}`)
        .join('\n')
      const system = appendBananaJsAiRules(
        `You are a BananaJS migration assistant. For each deprecated pattern below, provide a concise 1-2 sentence migration hint. Respond in plain text, one hint per bullet.`,
      )
      const raw = await provider.generate(
        `Provide migration hints for these deprecated patterns:\n${manualList}`,
        { system, temperature: 0.2 },
      )
      if (opts.debug) {
        console.log(chalk.dim('\n[debug] LLM upgrade hints:'))
        console.log(chalk.dim(raw))
      } else if (raw.trim()) {
        console.log(chalk.bold('\nAI Migration Hints:'))
        console.log(chalk.dim(raw.trim()))
      }
    } catch {
      // LLM step is optional; static findings are already complete
    }
  }

  const report: UpgradeReport = {
    totalFiles: files.length,
    findings: allFindings,
    appliedCount,
    patchFiles,
  }

  renderReport(report, cwd)
}
