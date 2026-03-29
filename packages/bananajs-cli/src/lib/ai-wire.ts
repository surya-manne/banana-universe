import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import { loadBananarc } from './llm/bananarc.js'
import { appendBananaJsAiRules } from './llm/bananajs-ai-rules.js'
import { resolveLlmProvider } from './llm/provider.factory.js'

export interface AiWireOptions {
  /** Optional second pass: ask LLM for narrative wiring steps (still does not modify files). */
  llm?: boolean
  cwd?: string
}

const MODULE_EXPORT_RE = /export\s+const\s+(\w+Module)\s*=/g

/** Discover export const *Module = createModule-style modules under src/modules (per-feature index.ts). */
export async function discoverFeatureModules(
  srcRoot: string,
): Promise<Array<{ name: string; importPath: string }>> {
  const modulesDir = path.join(srcRoot, 'modules')
  const out: Array<{ name: string; importPath: string }> = []
  let dirs: Awaited<ReturnType<typeof fs.readdir>>
  try {
    dirs = await fs.readdir(modulesDir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const d of dirs) {
    if (!d.isDirectory()) continue
    const indexFile = path.join(modulesDir, d.name, 'index.ts')
    let raw: string
    try {
      raw = await fs.readFile(indexFile, 'utf-8')
    } catch {
      continue
    }
    let m: RegExpExecArray | null
    MODULE_EXPORT_RE.lastIndex = 0
    while ((m = MODULE_EXPORT_RE.exec(raw)) !== null) {
      const exportName = m[1]
      const relImport = `./modules/${d.name}/index.js`
      out.push({ name: exportName, importPath: relImport })
    }
  }
  return out
}

export async function runAiWire(opts: AiWireOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd()
  const config = await loadBananarc(cwd)
  const bootstrapRel = config.project?.bootstrap ?? 'src/bootstrap.ts'
  const bootstrapAbs = path.join(cwd, bootstrapRel)
  const srcRoot = path.join(cwd, 'src')

  let bootstrapText: string
  try {
    bootstrapText = await fs.readFile(bootstrapAbs, 'utf-8')
  } catch {
    console.error(chalk.red(`Bootstrap not found: ${bootstrapAbs}`))
    console.error(chalk.yellow('Set project.bootstrap in .bananarc.json if your entry differs.'))
    process.exit(1)
  }

  const discovered = await discoverFeatureModules(srcRoot)
  if (discovered.length === 0) {
    console.log(chalk.yellow('No feature modules found under src/modules/*/index.ts'))
    return
  }

  const missing = discovered.filter(({ name }) => {
    const re = new RegExp(`\\b${name}\\b`)
    return !re.test(bootstrapText)
  })

  console.log(chalk.bold.blue('\nWire hints (dry-run)\n'))
  console.log(chalk.gray(`bananarc project: ${JSON.stringify(config.project ?? {}, null, 2)}`))
  console.log('')

  if (missing.length === 0) {
    console.log(chalk.green('All discovered modules appear referenced in bootstrap (name match).'))
    return
  }

  for (const m of missing) {
    console.log(
      chalk.cyan(`Add import: import { ${m.name} } from '${m.importPath}'`),
    )
    console.log(chalk.cyan(`Consider adding ${m.name} to defineBananaAppOptions({ modules: [ ... ] })`))
  }

  if (opts.llm) {
    const provider = resolveLlmProvider(config)
    const system = appendBananaJsAiRules(
      'You are a BananaJS wiring assistant. Given bootstrap source and a list of modules to wire, respond with a SHORT bullet list of exact code edits (imports + modules array). Do not repeat full files.',
    )
    try {
      const prose = await provider.generate(
        `Bootstrap file (${bootstrapRel}):\n\n${bootstrapText}\n\nModules to wire:\n${missing.map((m) => `- ${m.name} from ${m.importPath}`).join('\n')}`,
        { system, temperature: 0.1 },
      )
      console.log(chalk.bold('\nLLM wiring notes:\n'))
      console.log(prose)
    } catch (e) {
      console.error(chalk.yellow('Optional LLM wiring pass failed:'), e)
    }
  } else {
    console.log(chalk.gray('\nPass --llm for an optional LLM narrative (still does not edit files).'))
  }
}
