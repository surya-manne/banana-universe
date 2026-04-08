import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import { loadBananarc } from './llm/bananarc.js'
import { appendBananaJsAiRules } from './llm/bananajs-ai-rules.js'
import { resolveLlmProvider } from './llm/provider.factory.js'
import { type BaseCtx, type LlmOperation, LlmOperationError, runLlmOperation } from './llm/pipeline.js'

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

interface WireCtx extends BaseCtx {
  cwd: string
  opts: AiWireOptions
  bootstrapRel: string
  bootstrapAbs: string
  bootstrapText: string
  projectLog: string
  discovered: Array<{ name: string; importPath: string }>
  missing: Array<{ name: string; importPath: string }>
  llmNarrative: string
}

const wireOperation: LlmOperation<AiWireOptions, WireCtx, void> = {
  name: 'ai-wire',
  // LLM pass is optional: act() skipped when opts.llm !== true
  isProviderOptional: true,

  // Prepare: load bananarc, resolve paths; providerAvailable = opts.llm === true
  async prepare(opts) {
    const cwd = opts.cwd ?? process.cwd()
    const config = await loadBananarc(cwd)
    const bootstrapRel = config.project?.bootstrap ?? 'src/bootstrap.ts'
    const bootstrapAbs = path.join(cwd, bootstrapRel)
    const provider = resolveLlmProvider(config)
    return {
      cwd,
      opts,
      bootstrapRel,
      bootstrapAbs,
      bootstrapText: '',
      projectLog: JSON.stringify(config.project ?? {}, null, 2),
      discovered: [],
      missing: [],
      llmNarrative: '',
      provider,
      providerAvailable: opts.llm === true,
      debug: false,
    }
  },

  // Research: read bootstrap file, discover feature modules
  async research(ctx) {
    try {
      ctx.bootstrapText = await fs.readFile(ctx.bootstrapAbs, 'utf-8')
    } catch {
      throw new Error(
        `Bootstrap not found: ${ctx.bootstrapAbs}\nSet project.bootstrap in .bananarc.json if your entry differs.`,
      )
    }
    const srcRoot = path.join(ctx.cwd, 'src')
    ctx.discovered = await discoverFeatureModules(srcRoot)
    return ctx
  },

  // Plan: identify missing modules
  async plan(ctx) {
    ctx.missing = ctx.discovered.filter(({ name }) => {
      const re = new RegExp(`\\b${name}\\b`)
      return !re.test(ctx.bootstrapText)
    })
    return ctx
  },

  // Act: LLM wiring narrative (skipped when providerAvailable === false)
  async act(ctx) {
    const system = appendBananaJsAiRules(
      'You are a BananaJS bootstrap wiring assistant. Given the current bootstrap file and a list of unwired modules, produce ONLY copy-pasteable code edits:\n' +
      '1. The exact import line to add for each missing module (e.g. import { FooModule } from "./modules/foo/index.js")\n' +
      '2. The updated modules: [...] array with each new module inserted\n' +
      '3. CRITICAL ordering: plugins: [] MUST appear before modules: [] in defineBananaAppOptions / BananaApp.create so plugin-registered tokens (DataSource, Mongoose connection) are available when modules resolve\n' +
      '4. Bootstrap async rule: BananaApp.create(options) is required when plugins are present (async lifecycle). If the current bootstrap uses `new BananaApp(options)` and plugins are being added, note that it must change to `await BananaApp.create(options)` and the containing function must be async\n' +
      '5. If BananaApp.create or defineBananaAppOptions is absent, note the correct insertion point\n' +
      'Be precise and brief — show snippets, not full file rewrites. No markdown fences.',
    )
    ctx.llmNarrative = await ctx.provider.generate(
      `Bootstrap file (${ctx.bootstrapRel}):\n\n${ctx.bootstrapText}\n\nModules missing from bootstrap:\n${ctx.missing.map((m) => `- import { ${m.name} } from '${m.importPath}'`).join('\n')}`,
      { system, temperature: 0.1 },
    )
    return ctx
  },

  // Validate: print wire hints and optional LLM narrative
  async validate(ctx) {
    if (ctx.discovered.length === 0) {
      console.log(chalk.yellow('No feature modules found under src/modules/*/index.ts'))
      return
    }

    console.log(chalk.bold.blue('\nWire hints (dry-run)\n'))
    console.log(chalk.gray(`bananarc project: ${ctx.projectLog}`))
    console.log('')

    if (ctx.missing.length === 0) {
      console.log(chalk.green('All discovered modules appear referenced in bootstrap (name match).'))
      return
    }

    for (const m of ctx.missing) {
      console.log(chalk.cyan(`Add import: import { ${m.name} } from '${m.importPath}'`))
      console.log(
        chalk.cyan(
          `Consider adding ${m.name} to defineBananaAppOptions({ modules: [ ... ] })`,
        ),
      )
    }

    if (ctx.llmNarrative) {
      console.log(chalk.bold('\nLLM wiring notes:\n'))
      console.log(ctx.llmNarrative)
    } else {
      console.log(
        chalk.gray('\nPass --llm for an optional LLM narrative (still does not edit files).'),
      )
    }
  },
}

export async function runAiWire(opts: AiWireOptions): Promise<void> {
  try {
    await runLlmOperation(wireOperation, opts)
  } catch (e) {
    if (e instanceof LlmOperationError) {
      console.error(chalk.red(`ai wire failed [${e.stage}]: ${e.cause.message}`))
    } else {
      console.error(chalk.red('ai wire failed:'), e instanceof Error ? e.message : String(e))
    }
    process.exit(1)
  }
}
