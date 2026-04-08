#!/usr/bin/env node

import { Command } from 'commander'
import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { generateController, generateDto, generateMiddleware } from './lib/generate'
import { buildDddModuleFiles, type OrmChoice } from './lib/generate-module.js'
import { listRoutes } from './lib/routes'
import { migrateCodemod } from './lib/migrate'
import { dbStatus } from './lib/db'
import { openapiExport } from './lib/openapi'
import { aiGenerate, aiDoc, runAiReview } from './lib/ai.js'
import { loadBananarc } from './lib/llm/bananarc.js'
import { runAiWire } from './lib/ai-wire.js'
import { runAiTestScaffold } from './lib/ai-test-scaffold.js'
import { runAiExplain } from './lib/ai-explain.js'
import { aiGenerateModule } from './lib/ai-module.js'
import { aiSetup } from './lib/ai-setup.js'
import { runAiContext, type AiContextFormat } from './lib/ai-context.js'
import { runAiMock } from './lib/ai-mock.js'
import { runAiOpenApiEnrich } from './lib/ai-openapi-enrich.js'
import { runAiDebug } from './lib/ai-debug.js'
import { runAiPerf } from './lib/ai-perf.js'
import { runAiUpgrade } from './lib/ai-upgrade.js'
import { runAiChangelog } from './lib/ai-changelog.js'
import { loadEnvFile } from './lib/llm/env-loader.js'
import { startMcpServer } from './lib/mcp-server.js'
import { writeScaffoldedApp } from './lib/create-app.js'
import { APP_PRESETS, getPresetById, type AppPreset } from './lib/create-app-presets.js'
import { PRESET_ORM_HELP, presetIdToOrm } from './lib/preset-orm.js'
import {
  findBootstrapRelativePath,
  patchTypeormEntitiesArray,
  registerModuleInBootstrap,
} from './lib/bootstrap-patch.js'
import {
  moduleExportName,
  moduleOutputBase,
  toKebabCase,
  toPascalCase,
} from './lib/generate-module.js'

/** Keep in sync with packages/bananajs-cli/package.json */
const CLI_VERSION = '0.4.0'

const program = new Command()

program
  .name('bananajs')
  .version(CLI_VERSION)
  .description('BananaJS CLI — scaffold and generate BananaJS resources')

program
  .command('new [appName]')
  .description('Scaffold a new BananaJS application from built-in presets (no git clone)')
  .option('--preset <id>', 'mongodb | sql — skip interactive template choice')
  .action(function (this: Command, appName?: string) {
    const opts = this.opts() as { preset?: string }
    createApp(appName, opts).catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

program
  .command('generate [type] [name]')
  .alias('g')
  .description(
    'Generate a BananaJS resource (controller | dto | middleware | module — DDD layered module). Omit args in a TTY to be prompted.',
  )
  .option('--dry-run', 'Print files that would be created without writing them')
  .option(
    '--orm <orm>',
    'For type module: typeorm | mongoose | none (default: typeorm if non-interactive)',
  )
  .option(
    '--preset <id>',
    `For type module: ${PRESET_ORM_HELP} — overrides non-interactive default; use --orm to force a specific adapter`,
  )
  .option('--out <dir>', 'Output base directory (for type module; default: ./src)')
  .option(
    '--skip-bootstrap',
    'For type module: do not register in bootstrap or patch TypeORM entities[]',
  )
  .action(function (this: Command, typeArg?: string, nameArg?: string) {
    const options = this.opts() as {
      dryRun?: boolean
      orm?: string
      preset?: string
      out?: string
      skipBootstrap?: boolean
    }
    resolveGenerateArgs(typeArg, nameArg)
      .then(({ type, name }) =>
        generateResource(type, name, {
          dryRun: options.dryRun ?? false,
          orm: options.orm,
          preset: options.preset,
          out: options.out,
          skipBootstrap: options.skipBootstrap ?? false,
        }),
      )
      .catch((err: unknown) => {
        console.error('Unexpected error:', err)
        process.exit(1)
      })
  })

program
  .command('routes')
  .description('List registered routes (static scan; TTY prompts for directory)')
  .option('--root <dir>', 'Directory to scan (default: src)')
  .action((opts: { root?: string }) => {
    const run = async (): Promise<void> => {
      let root = opts.root
      if (!root && process.stdin.isTTY) {
        const { dir } = await inquirer.prompt<{ dir: string }>([
          {
            type: 'input',
            name: 'dir',
            message: 'Directory to scan for controllers:',
            default: 'src',
          },
        ])
        root = dir.trim() || 'src'
      }
      await listRoutes(root ?? 'src')
    }
    run().catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

program
  .command('migrate')
  .description('Express → BananaJS route codemod (generates controller files from Express routes)')
  .action(() => {
    const run = async (): Promise<void> => {
      if (process.stdin.isTTY) {
        const { ok } = await inquirer.prompt<{ ok: boolean }>([
          {
            type: 'confirm',
            name: 'ok',
            message: 'Run the Express → BananaJS codemod in the current directory?',
            default: true,
          },
        ])
        if (!ok) return
      }
      await migrateCodemod()
    }
    run().catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

program
  .command('db')
  .description('Database tools')
  .option('--status', 'Show ORM migration status (TypeORM); Mongoose has no migrate CLI')
  .action((opts: { status?: boolean }) => {
    const run = async (): Promise<void> => {
      let status = opts.status
      if (status === undefined && process.stdin.isTTY) {
        const { action } = await inquirer.prompt<{ action: 'status' | 'exit' }>([
          {
            type: 'list',
            name: 'action',
            message: 'Database tools:',
            choices: [
              { name: 'Show TypeORM migration status', value: 'status' },
              { name: 'Exit', value: 'exit' },
            ],
          },
        ])
        if (action === 'status') status = true
      }
      if (status) {
        await dbStatus()
        return
      }
      console.log(chalk.yellow('No action specified. Use --status or run interactively in a TTY.'))
    }
    run().catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

const openapiCmd = program.command('openapi').description('OpenAPI tools')

openapiCmd
  .command('export')
  .description('Export OpenAPI spec and optionally generate TypeScript types')
  .option('--out <path>', 'Output path for the spec file')
  .option('--client <type>', 'Generate client SDK (supported: typescript)')
  .action((opts: { out?: string; client?: string }) => {
    const run = async (): Promise<void> => {
      let out = opts.out
      let client = opts.client
      if (process.stdin.isTTY && !out) {
        const { useDefault } = await inquirer.prompt<{ useDefault: boolean }>([
          {
            type: 'confirm',
            name: 'useDefault',
            message: 'Export OpenAPI JSON to ./openapi.json in the project root?',
            default: true,
          },
        ])
        if (!useDefault) {
          const { path: custom } = await inquirer.prompt<{ path: string }>([
            {
              type: 'input',
              name: 'path',
              message: 'Output path (relative to cwd):',
              default: 'openapi.json',
            },
          ])
          out = custom.trim() || 'openapi.json'
        }
      }
      if (process.stdin.isTTY && !client) {
        const { gen } = await inquirer.prompt<{ gen: boolean }>([
          {
            type: 'confirm',
            name: 'gen',
            message: 'Also generate TypeScript types (openapi-typescript)?',
            default: false,
          },
        ])
        if (gen) client = 'typescript'
      }
      await openapiExport({ out, client })
    }
    run().catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

const aiCmd = program
  .command('ai')
  .description('AI-powered code generation, documentation, and review')

aiCmd
  .command('setup')
  .alias('s')
  .description('Interactive wizard: choose LLM provider and write .bananarc.json')
  .action(() => {
    aiSetup().catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

aiCmd
  .command('generate')
  .alias('g')
  .description(
    'Generate BananaJS files: flat scaffold (--from-schema / --from-prompt) or full DDD module (--module); TTY prompts when args omitted',
  )
  .option(
    '--module [description]',
    'Generate a full DDD module; use with a description, or with --from-schema (bare --module uses schema only)',
  )
  .option(
    '--from-schema <file>',
    'JSON Schema, OpenAPI spec (flat codegen), or DDD module when used with --module',
  )
    .option(
    '--from-prompt <text>',
    'Natural language for flat controller+dto+service (uses .bananarc.json LLM)',
  )
  .option('--orm <orm>', 'For DDD module: typeorm | mongoose | none')
  .option(
    '--preset <id>',
    `For DDD module: ${PRESET_ORM_HELP} — sets ORM when --orm omitted (overridden by --orm)`,
  )
  .option(
    '--out <dir>',
    'Output directory (flat: cwd; DDD: default from .bananarc.json generate.outDir)',
  )
  .option('--dry-run', 'Print files without writing')
  .option('--detailed', 'Second LLM pass to expand domain/application service bodies (DDD module)')
  .option('--debug', 'Print raw LLM output for extraction/debugging')
  .option(
    '--plan-only',
    'Analyse use case and emit HITL questions JSON without generating files (DDD module)',
  )
  .option(
    '--context <json>',
    'JSON-serialised UseCaseContext from a prior --plan-only run with developer answers; drives domain-appropriate generation',
  )
  .action(
    (opts: {
      module?: string | boolean
      fromSchema?: string
      fromPrompt?: string
      orm?: string
      preset?: string
      out?: string
      dryRun?: boolean
      detailed?: boolean
      debug?: boolean
      planOnly?: boolean
      context?: string
    }) => {
      const run = async (): Promise<void> => {
        const wantDdd = opts.module !== undefined || opts.planOnly || Boolean(opts.context)
        const wantFlat = Boolean(opts.fromSchema || opts.fromPrompt) && !wantDdd
        if (!wantDdd && !wantFlat && process.stdin.isTTY) {
          const { mode } = await inquirer.prompt<{ mode: 'ddd' | 'flat' }>([
            {
              type: 'list',
              name: 'mode',
              message: 'What should the AI generate?',
              choices: [
                { name: 'Full DDD module under src/modules/ (LLM extraction)', value: 'ddd' },
                { name: 'Flat controller + dto + service (legacy scaffold)', value: 'flat' },
              ],
            },
          ])
          if (mode === 'ddd') {
            await aiGenerateModule({
              module: true,
              orm: opts.orm,
              preset: opts.preset,
              out: opts.out,
              dryRun: opts.dryRun,
              detailed: opts.detailed,
              debug: opts.debug,
            })
            return
          }
          const flat = await inquirer.prompt<{
            kind: 'schema' | 'prompt'
            path?: string
            text?: string
          }>([
            {
              type: 'list',
              name: 'kind',
              message: 'Flat codegen from:',
              choices: [
                { name: 'Natural language (LLM)', value: 'prompt' },
                { name: 'JSON Schema / OpenAPI file', value: 'schema' },
              ],
            },
            {
              type: 'input',
              name: 'path',
              message: 'Path to schema file (relative to cwd):',
              when: (a) => a.kind === 'schema',
            },
            {
              type: 'input',
              name: 'text',
              message: 'Describe the API slice:',
              when: (a) => a.kind === 'prompt',
            },
          ])
          if (flat.kind === 'schema') {
            const p = flat.path?.trim()
            if (!p) {
              console.error(chalk.red('Schema path is required.'))
              process.exit(1)
            }
            await aiGenerate({ fromSchema: p, out: opts.out, dryRun: opts.dryRun })
            return
          }
          const text = flat.text?.trim()
          if (!text) {
            console.error(chalk.red('Prompt text is required.'))
            process.exit(1)
          }
          await aiGenerate({ fromPrompt: text, out: opts.out, dryRun: opts.dryRun })
          return
        }

        if (wantDdd) {
          await aiGenerateModule({
            module:
              typeof opts.module === 'string'
                ? opts.module
                : opts.module === true
                ? true
                : undefined,
            fromSchema: opts.fromSchema,
            orm: opts.orm,
            preset: opts.preset,
            out: opts.out,
            dryRun: opts.dryRun,
            detailed: opts.detailed,
            debug: opts.debug,
            planOnly: opts.planOnly,
            context: opts.context,
          })
          return
        }
        await aiGenerate({
          fromSchema: opts.fromSchema,
          fromPrompt: opts.fromPrompt,
          out: opts.out,
          dryRun: opts.dryRun,
        })
      }
      run().catch((err: unknown) => {
        console.error('Unexpected error:', err)
        process.exit(1)
      })
    },
  )

aiCmd
  .command('doc')
  .alias('d')
  .description('Generate JSDoc for existing controllers using AI')
  .option('--file <path>', 'Path to controller file (default: scan src/)')
  .option('--dry-run', 'Print changes without writing')
  .action((opts: { file?: string; dryRun?: boolean }) => {
    aiDoc(opts).catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

aiCmd
  .command('review [target]')
  .alias('r')
  .description(
    'Structured AI review (JSON + summary); non-interactive — pass --file, --module, or a positional path',
  )
  .option('--file <path>', 'Path to a TypeScript file to review')
  .option('--module <path>', 'Directory (e.g. src/modules/foo) — all .ts files')
  .option('--format <fmt>', 'text | json (default: text)', 'text')
  .option('--sarif', 'Emit SARIF 2.1.0 instead of text/json')
  .option('--fix', 'Reserved: safe auto-fix is not applied; shows policy message')
  .option('--debug', 'Print raw LLM output for each attempt (useful when JSON parse fails)')
  .action(function (this: Command, target: string | undefined) {
    const run = async (): Promise<void> => {
      const opts = this.opts() as {
        file?: string
        module?: string
        format?: string
        sarif?: boolean
        fix?: boolean
        debug?: boolean
      }
      let file = opts.file
      let modulePath = opts.module
      if (!file && !modulePath && target?.trim()) {
        const rel = target.trim()
        const abs = path.resolve(process.cwd(), rel)
        const st = await fs.stat(abs).catch(() => null)
        if (st?.isFile()) {
          file = rel
        } else if (st?.isDirectory()) {
          modulePath = rel
        } else {
          const bare = !/[\\/]/.test(path.normalize(rel))
          if (bare) {
            modulePath = rel
          } else {
            console.error(chalk.red(`Not found: ${rel}`))
            process.exit(1)
          }
        }
      }
      if (!file && !modulePath) {
        console.error(
          chalk.red(
            'Pass --file <path>, --module <dir>, or a positional path (e.g. bananajs ai review src/modules/widgets).',
          ),
        )
        process.exit(1)
      }
      const fmt = opts.format === 'json' ? 'json' : 'text'
      await runAiReview({
        file,
        module: modulePath,
        format: fmt,
        sarif: opts.sarif ?? false,
        fix: opts.fix ?? false,
        debug: opts.debug ?? false,
      })
    }
    run().catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

aiCmd
  .command('wire')
  .alias('w')
  .description(
    'Suggest bootstrap wiring for discovered feature modules (dry-run; validates against .bananarc)',
  )
  .option('--llm', 'Optional LLM narrative (still does not modify files)')
  .action((opts: { llm?: boolean }) => {
    runAiWire({ llm: opts.llm ?? false }).catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

aiCmd
  .command('test')
  .alias('t')
  .description('Scaffold a minimal node:test + supertest file (BananaTestApp-style recipes)')
  .option('--out <path>', 'Output path (default: src/__tests__/ai-scaffold.test.ts)')
  .action((opts: { out?: string }) => {
    runAiTestScaffold({ out: opts.out }).catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

aiCmd
  .command('explain [file]')
  .alias('e')
  .description('Short LLM summary of a TypeScript file (for humans / PR notes)')
  .action((file: string | undefined) => {
    runAiExplain(file).catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

aiCmd
  .command('context')
  .alias('ctx')
  .description(
    'Generate project-tailored AI context files (CLAUDE.md, .cursor/rules/bananajs.mdc, copilot-instructions.md, AGENTS.md)',
  )
  .option(
    '--format <fmt>',
    'claude | cursor | copilot | agents | all (default: all)',
    'all',
  )
  .option('--out <dir>', 'Output directory (default: project root)')
  .option('--dry-run', 'Preview files without writing')
  .action((opts: { format?: string; out?: string; dryRun?: boolean }) => {
    const validFormats = ['claude', 'cursor', 'copilot', 'agents', 'all']
    const fmt = opts.format ?? 'all'
    if (!validFormats.includes(fmt)) {
      console.error(chalk.red(`Invalid --format "${fmt}". Use: ${validFormats.join(' | ')}`))
      process.exit(1)
    }
    runAiContext({
      format: fmt as AiContextFormat,
      out: opts.out,
      dryRun: opts.dryRun ?? false,
    }).catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

aiCmd
  .command('mock')
  .description('Generate TypeScript fixture factories and JSON samples from Zod schemas')
  .option('--schema <file>', 'Path to a TypeScript file containing a Zod schema')
  .option('--module <path>', 'Directory — generates fixtures for all Zod schema files found')
  .option('--out <dir>', 'Output directory for __fixtures__ folder (default: alongside input)')
  .option('--format <fmt>', 'ts | json (default: ts)', 'ts')
  .option('--dry-run', 'Preview output without writing')
  .action((opts: { schema?: string; module?: string; out?: string; format?: string; dryRun?: boolean }) => {
    const fmt = opts.format ?? 'ts'
    if (fmt !== 'ts' && fmt !== 'json') {
      console.error(chalk.red(`Invalid --format "${fmt}". Use: ts | json`))
      process.exit(1)
    }
    runAiMock({
      schema: opts.schema,
      module: opts.module,
      out: opts.out,
      format: fmt as 'ts' | 'json',
      dryRun: opts.dryRun ?? false,
    }).catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

const aiOpenapiCmd = aiCmd.command('openapi').description('AI-powered OpenAPI tools')

aiOpenapiCmd
  .command('enrich')
  .description(
    'Enrich an OpenAPI spec with missing summaries, descriptions, examples, and tags using AI',
  )
  .requiredOption('--in <spec>', 'Input OpenAPI JSON file (from `bananajs openapi export`)')
  .requiredOption('--out <spec>', 'Output OpenAPI JSON file (must differ from --in)')
  .option('--dry-run', 'Show diff of proposed changes without writing')
  .option('--skip-examples', 'Do not enrich response descriptions/examples')
  .option('--skip-tags', 'Do not add missing tags')
  .action(
    (opts: { in: string; out: string; dryRun?: boolean; skipExamples?: boolean; skipTags?: boolean }) => {
      runAiOpenApiEnrich({
        in: opts.in,
        out: opts.out,
        dryRun: opts.dryRun ?? false,
        skipExamples: opts.skipExamples ?? false,
        skipTags: opts.skipTags ?? false,
      }).catch((err: unknown) => {
        console.error('Unexpected error:', err)
        process.exit(1)
      })
    },
  )

aiCmd
  .command('debug [input]')
  .description(
    'Analyze a BananaJS runtime error or stack trace; receive root-cause explanation and fix. Accepts stdin, --input <file>, or inline text.',
  )
  .option('--input <path>', 'Path to file containing the stack trace (alternative to stdin / positional)')
  .option('--file <path>', 'Optional source file to attach for additional context')
  .option('--format <fmt>', 'text | json (default: text)', 'text')
  .option('--debug', 'Print raw LLM output')
  .action(function (this: Command, inputArg: string | undefined) {
    const opts = this.opts() as { input?: string; file?: string; format?: string; debug?: boolean }
    runAiDebug({
      input: opts.input ?? inputArg,
      file: opts.file,
      format: opts.format === 'json' ? 'json' : 'text',
      debug: opts.debug ?? false,
    }).catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

aiCmd
  .command('perf')
  .description(
    'Analyze controller/service files for performance antipatterns (N+1, missing cache, unbounded queries). Static-first — most checks require no LLM.',
  )
  .option('--file <path>', 'Path to a TypeScript file to analyze')
  .option('--module <path>', 'Directory or bare module name (e.g. orders) — all .ts files')
  .option('--format <fmt>', 'text | json (default: text)', 'text')
  .option('--debug', 'Print raw LLM output')
  .action((opts: { file?: string; module?: string; format?: string; debug?: boolean }) => {
    if (!opts.file && !opts.module) {
      console.error(chalk.red('Pass --file <path> or --module <name>.'))
      process.exit(1)
    }
    runAiPerf({
      file: opts.file,
      module: opts.module,
      format: opts.format === 'json' ? 'json' : 'text',
      debug: opts.debug ?? false,
    }).catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

aiCmd
  .command('upgrade')
  .description(
    'Scan codebase for deprecated BananaJS patterns and generate migration hints or patch files.',
  )
  .option('--to <version>', 'Target BananaJS version (e.g. 0.6.0); default: all patterns')
  .option('--apply', 'Apply safe mechanical fixes in-place (requires explicit flag; ambiguous changes emit .patch only)')
  .option('--out <dir>', 'Output directory for .patch files')
  .option('--dry-run', 'Print findings without modifying any file')
  .option('--debug', 'Print raw LLM output for ambiguous findings')
  .action((opts: { to?: string; apply?: boolean; out?: string; dryRun?: boolean; debug?: boolean }) => {
    runAiUpgrade({
      to: opts.to,
      apply: opts.apply ?? false,
      out: opts.out,
      dryRun: opts.dryRun ?? false,
      debug: opts.debug ?? false,
    }).catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

aiCmd
  .command('changelog')
  .description(
    'Generate a structured developer changelog from git commits (optionally enriched with OpenAPI spec diff).',
  )
  .option('--from <ref>', 'Start git ref (tag, commit, branch). Default: previous tag.')
  .option('--to <ref>', 'End git ref (default: HEAD)')
  .option('--before <spec>', 'OpenAPI JSON spec snapshot before the range')
  .option('--after <spec>', 'OpenAPI JSON spec snapshot after the range')
  .option('--format <fmt>', 'md | json (default: md)', 'md')
  .option('--out <file>', 'Output file path. Default: stdout.')
  .option('--debug', 'Print raw LLM output')
  .action((opts: { from?: string; to?: string; before?: string; after?: string; format?: string; out?: string; debug?: boolean }) => {
    const fmt = opts.format === 'json' ? 'json' : 'md'
    runAiChangelog({
      from: opts.from,
      to: opts.to,
      before: opts.before,
      after: opts.after,
      format: fmt,
      out: opts.out,
      debug: opts.debug ?? false,
    }).catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

aiCmd
  .command('contract')
  .description(
    'Generate Pact-compatible consumer contract tests from an OpenAPI spec. Accepts --fixtures from `bananajs ai mock --format json` to skip redundant LLM calls.',
  )
  .requiredOption('--spec <openapi.json>', 'Input OpenAPI JSON file (from `bananajs openapi export`)')
  .requiredOption('--consumer <name>', 'Consumer name for the Pact contract (e.g. "frontend")')
  .requiredOption('--provider <name>', 'Provider name for the Pact contract (e.g. "api")')
  .option('--fixtures <dir>', 'Directory containing JSON fixture files from `bananajs ai mock --format json`; skips LLM payload generation')
  .option('--out <dir>', 'Output directory for generated test files (default: src/__tests__/contract)')
  .option('--dry-run', 'Preview generated test files without writing')
  .option('--debug', 'Print raw LLM output')
  .action(
    (opts: {
      spec: string
      consumer: string
      provider: string
      fixtures?: string
      out?: string
      dryRun?: boolean
      debug?: boolean
    }) => {
      import('./lib/ai-contract.js')
        .then(({ runAiContract }) =>
          runAiContract({
            spec: opts.spec,
            consumer: opts.consumer,
            provider: opts.provider,
            fixtures: opts.fixtures,
            out: opts.out,
            dryRun: opts.dryRun ?? false,
            debug: opts.debug ?? false,
          }),
        )
        .catch((err: unknown) => {
          console.error('Unexpected error:', err)
          process.exit(1)
        })
    },
  )

// ─── MCP server ──────────────────────────────────────────────────────────────

const mcpCmd = program.command('mcp').description('Model Context Protocol (MCP) tools server')

mcpCmd
  .command('start')
  .description(
    'Start the BananaJS MCP server on stdio. Exposes bananajs_routes, bananajs_explain, bananajs_review, bananajs_generate, bananajs_mock, bananajs_debug, bananajs_perf, bananajs_upgrade as MCP tools.',
  )
  .action(() => {
    startMcpServer().catch((e: unknown) => {
      process.stderr.write(`[bananajs-mcp] Fatal: ${String(e)}\n`)
      process.exit(1)
    })
  })

// Top-level -h/--help and -V/--version: handle before parse so they always work with subcommand-only CLIs
// (some Commander / bundling setups treat these as unknown command names).
const argv = process.argv.slice(2)
if (argv.length === 1) {
  const only = argv[0]
  if (only === '-h' || only === '--help') {
    program.help()
  }
  if (only === '-V' || only === '--version') {
    process.stdout.write(`${CLI_VERSION}\n`)
    process.exit(0)
  }
}

;(async () => {
  // MCP stdio mode: stdout is reserved for JSON-RPC only.
  // Redirect all console.log/info/warn to stderr before any other code runs.
  const args = process.argv.slice(2)
  if (args.includes('mcp') && args.includes('start')) {
    const toStderr = (...a: unknown[]) =>
      process.stderr.write(a.map((x) => String(x)).join(' ') + '\n')
    console.log = toStderr
    console.info = toStderr
    console.warn = toStderr
  }

  await loadEnvFile(process.cwd())
  program.parse(process.argv)
})().catch((err: unknown) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})

async function createApp(
  appNameArg: string | undefined,
  cmdOpts: { preset?: string },
): Promise<void> {
  let appName = appNameArg
  if (!appName) {
    const { appName: answered } = await inquirer.prompt<{ appName: string }>([
      {
        type: 'input',
        name: 'appName',
        message: 'What is the name of your app?',
        default: 'my-bananajs-app',
      },
    ])
    appName = answered
  }

  let preset: AppPreset | undefined
  if (cmdOpts.preset) {
    preset = getPresetById(cmdOpts.preset)
    if (!preset) {
      const allowed = APP_PRESETS.map((p) => p.id).join(', ')
      console.log(chalk.red(`Unknown --preset "${cmdOpts.preset}". Use: ${allowed}`))
      process.exit(1)
    }
  } else if (!process.stdin.isTTY) {
    preset = getPresetById('sql')
    console.log(
      chalk.yellow(
        'Non-interactive terminal: using preset "sql". Pass --preset mongodb or --preset sql to choose explicitly.',
      ),
    )
  } else {
    const { presetId } = await inquirer.prompt<{ presetId: string }>([
      {
        type: 'list',
        name: 'presetId',
        message: 'Which app configuration do you want?',
        choices: APP_PRESETS.map((p) => ({
          name: `${p.promptLabel} — ${p.description}`,
          value: p.id,
        })),
      },
    ])
    preset = getPresetById(presetId)
  }

  if (!preset || !appName) {
    console.log(chalk.red('Could not resolve app name or preset.'))
    process.exit(1)
  }

  const appDir = path.join(process.cwd(), appName)

  try {
    await fs.stat(appDir)
    console.log(chalk.red(`An app with the name "${appName}" already exists.`))
    process.exit(1)
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Error checking if app exists:', error)
      process.exit(1)
    }
  }

  try {
    await writeScaffoldedApp(appDir, { appName, preset })
    console.log(chalk.green(`App "${appName}" created successfully!`))
    console.log(chalk.cyan(`Next: cd ${appName} && npm install && npm run build && npm start`))
  } catch (error) {
    console.error('Error creating app:', error)
    await fs.rm(appDir, { recursive: true, force: true })
    process.exit(1)
  }
}

async function resolveGenerateArgs(
  typeArg?: string,
  nameArg?: string,
): Promise<{ type: string; name: string }> {
  let type = typeArg?.trim()
  let name = nameArg?.trim()
  if (process.stdin.isTTY) {
    if (!type) {
      const { t } = await inquirer.prompt<{ t: string }>([
        {
          type: 'list',
          name: 't',
          message: 'What do you want to generate?',
          choices: [
            { name: 'module (DDD feature under src/modules/)', value: 'module' },
            { name: 'controller', value: 'controller' },
            { name: 'dto', value: 'dto' },
            { name: 'middleware', value: 'middleware' },
          ],
        },
      ])
      type = t
    }
    if (!name) {
      const { n } = await inquirer.prompt<{ n: string }>([
        {
          type: 'input',
          name: 'n',
          message: 'Name (e.g. Product or order-item):',
          validate: (v) => (v && v.trim().length > 0 ? true : 'Enter a name'),
        },
      ])
      name = n.trim()
    }
  }
  if (!type || !name) {
    console.error(
      chalk.red('Usage: bananajs generate <type> <name> — or omit args in a TTY to be prompted.'),
    )
    process.exit(1)
  }
  return { type, name }
}

async function generateResource(
  type: string,
  name: string,
  opts: {
    dryRun: boolean
    orm?: string
    preset?: string
    out?: string
    skipBootstrap?: boolean
  },
): Promise<void> {
  const validTypes = ['controller', 'dto', 'middleware', 'module']
  if (!validTypes.includes(type)) {
    console.log(chalk.red(`Unknown type: "${type}". Valid types: ${validTypes.join(', ')}`))
    process.exit(1)
  }

  if (type === 'module') {
    await generateModuleResource(name, opts)
    return
  }

  const dryRun = opts.dryRun
  let fileName: string
  let content: string

  if (type === 'controller') {
    fileName = `${name}.controller.ts`
    content = generateController(name)
  } else if (type === 'dto') {
    fileName = `${name}.dto.ts`
    content = generateDto(name)
  } else {
    fileName = `${name}.middleware.ts`
    content = generateMiddleware(name)
  }

  const outputPath = path.join(process.cwd(), fileName)

  if (dryRun) {
    console.log(chalk.cyan(`[dry-run] Would create: ${outputPath}`))
    console.log(chalk.gray('---'))
    console.log(chalk.gray(content))
    return
  }

  await fs.writeFile(outputPath, content, 'utf-8')
  console.log(chalk.green(`Created: ${outputPath}`))
}

async function generateModuleResource(
  name: string,
  opts: { dryRun: boolean; orm?: string; preset?: string; out?: string; skipBootstrap?: boolean },
): Promise<void> {
  let ormChoice: OrmChoice
  const raw = opts.orm?.toLowerCase()
  if (raw === 'typeorm' || raw === 'mongoose' || raw === 'none') {
    ormChoice = raw
  } else if (opts.orm !== undefined) {
    console.log(chalk.red(`Invalid --orm "${opts.orm}". Use typeorm, mongoose, or none.`))
    process.exit(1)
  } else if (opts.preset) {
    const mapped = presetIdToOrm(opts.preset)
    if (!mapped) {
      console.log(chalk.red(`Invalid --preset "${opts.preset}". Use: ${PRESET_ORM_HELP}`))
      process.exit(1)
    }
    ormChoice = mapped
  } else if (process.stdin.isTTY) {
    const answers = await inquirer.prompt<{ orm: OrmChoice }>([
      {
        type: 'list',
        name: 'orm',
        message: 'Which ORM adapter?',
        choices: [
          { name: 'TypeORM (default)', value: 'typeorm' },
          { name: 'Mongoose', value: 'mongoose' },
          { name: 'None (in-memory stub)', value: 'none' },
        ],
        default: 'typeorm',
      },
    ])
    ormChoice = answers.orm
  } else {
    ormChoice = 'typeorm'
  }

  const cwd = process.cwd()
  const outBase = path.join(cwd, opts.out ?? 'src')
  const files = buildDddModuleFiles(name, ormChoice)

  for (const f of files) {
    const outputPath = path.join(outBase, f.relativePath)
    if (opts.dryRun) {
      console.log(chalk.cyan(`[dry-run] Would create: ${outputPath}`))
      console.log(chalk.gray('---'))
      console.log(chalk.gray(f.content))
      continue
    }
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, f.content, 'utf-8')
    console.log(chalk.green(`Created: ${outputPath}`))
  }

  if (opts.dryRun || opts.skipBootstrap) {
    return
  }

  const config = await loadBananarc(cwd)
  const kebab = toKebabCase(name)
  const Pascal = toPascalCase(name)
  const discovered = await findBootstrapRelativePath(cwd)
  const bootstrapRel = discovered ?? config.project?.bootstrap ?? 'src/bootstrap.ts'

  await registerModuleInBootstrap({
    cwd,
    bootstrapRelative: bootstrapRel,
    moduleFolderKebab: kebab,
    moduleExportName: moduleExportName(kebab),
    moduleIndexAbs: path.join(outBase, 'modules', kebab, 'index.ts'),
    dryRun: false,
  })

  if (ormChoice === 'typeorm') {
    const entityAbs = path.join(
      outBase,
      moduleOutputBase(kebab),
      'infrastructure',
      `${Pascal}.orm-entity.ts`,
    )
    await patchTypeormEntitiesArray({
      cwd,
      entityFileAbs: path.resolve(entityAbs),
      entityClassName: `${Pascal}OrmEntity`,
      dryRun: false,
    })
  }
}
