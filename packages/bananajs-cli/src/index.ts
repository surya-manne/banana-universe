#!/usr/bin/env node

import { Command } from 'commander'
import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import { spawn } from 'child_process'
import inquirer from 'inquirer'
import { generateController, generateDto, generateMiddleware } from './lib/generate'
import { buildDddModuleFiles, type OrmChoice } from './lib/generate-module.js'
import { listRoutes } from './lib/routes'
import { migrateCodemod } from './lib/migrate'
import { dbStatus } from './lib/db'
import { openapiExport } from './lib/openapi'
import { aiGenerate, aiDoc, aiReview } from './lib/ai.js'
import { aiGenerateModule } from './lib/ai-module.js'
import { aiSetup } from './lib/ai-setup.js'

const MONGO_TEMPLATE_REPO = 'https://github.com/sprakas/bananajs-mongo-app-template.git'
const SQL_TEMPLATE_REPO = 'https://github.com/sprakas/bananajs-sql-app-template.git'

const program = new Command()

program
  .name('bananajs')
  .version('0.3.0')
  .description('BananaJS CLI — scaffold and generate BananaJS resources')

program
  .command('new [appName]')
  .description('Scaffold a new BananaJS application')
  .action((appName?: string) => {
    createApp(appName).catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

program
  .command('generate <type> <name>')
  .alias('g')
  .description(
    'Generate a BananaJS resource (controller | dto | middleware | module — DDD layered module)',
  )
  .option('--dry-run', 'Print files that would be created without writing them')
  .option(
    '--orm <orm>',
    'For type module: typeorm | mongoose | none (default: typeorm if non-interactive)',
  )
  .option('--out <dir>', 'Output base directory (for type module; default: ./src)')
  .action(
    (type: string, name: string, options: { dryRun?: boolean; orm?: string; out?: string }) => {
      generateResource(type, name, {
        dryRun: options.dryRun ?? false,
        orm: options.orm,
        out: options.out,
      }).catch((err: unknown) => {
        console.error('Unexpected error:', err)
        process.exit(1)
      })
    },
  )

program
  .command('routes')
  .description('List registered routes (static scan of src/ directory)')
  .action(() => {
    listRoutes().catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

program
  .command('migrate')
  .description('Express → BananaJS route codemod (generates controller files from Express routes)')
  .action(() => {
    migrateCodemod().catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

program
  .command('db')
  .description('Database tools')
  .option('--status', 'Show ORM migration status (TypeORM); Mongoose has no migrate CLI')
  .action((opts: { status?: boolean }) => {
    if (opts.status) {
      dbStatus().catch((err: unknown) => {
        console.error('Unexpected error:', err)
        process.exit(1)
      })
    } else {
      console.log(chalk.yellow('No action specified. Use --status to check migration status.'))
    }
  })

const openapiCmd = program.command('openapi').description('OpenAPI tools')

openapiCmd
  .command('export')
  .description('Export OpenAPI spec and optionally generate TypeScript types')
  .option('--out <path>', 'Output path for the spec file')
  .option('--client <type>', 'Generate client SDK (supported: typescript)')
  .action((opts: { out?: string; client?: string }) => {
    openapiExport(opts).catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

const aiCmd = program
  .command('ai')
  .description('AI-powered code generation, documentation, and review')

aiCmd
  .command('setup')
  .description('Interactive wizard: choose LLM provider and write .bananarc.json')
  .action(() => {
    aiSetup().catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

aiCmd
  .command('generate')
  .description(
    'Generate BananaJS files: flat scaffold (--from-schema / --from-prompt) or full DDD module (--module)',
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
    '--out <dir>',
    'Output directory (flat: cwd; DDD: default from .bananarc.json generate.outDir)',
  )
  .option('--dry-run', 'Print files without writing')
  .option('--detailed', 'Second LLM pass to expand domain/application service bodies (DDD module)')
  .option('--debug', 'Print raw LLM output for extraction/debugging')
  .action(
    (opts: {
      module?: string | boolean
      fromSchema?: string
      fromPrompt?: string
      orm?: string
      out?: string
      dryRun?: boolean
      detailed?: boolean
      debug?: boolean
    }) => {
      const run = async (): Promise<void> => {
        if (opts.module !== undefined) {
          await aiGenerateModule({
            module: typeof opts.module === 'string' ? opts.module : undefined,
            fromSchema: opts.fromSchema,
            orm: opts.orm,
            out: opts.out,
            dryRun: opts.dryRun,
            detailed: opts.detailed,
            debug: opts.debug,
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
  .command('review')
  .description('Review a BananaJS controller for best practices')
  .option('--file <path>', 'Path to controller file to review')
  .action((opts: { file?: string }) => {
    aiReview(opts).catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

program.parse(process.argv)

async function createApp(appNameArg?: string): Promise<void> {
  const prompts: {
    type: string
    name: string
    message: string
    default?: string
    choices?: string[]
  }[] = []

  if (!appNameArg) {
    prompts.push({
      type: 'input',
      name: 'appName',
      message: 'What is the name of your app?',
      default: 'my-bananajs-app',
    })
  }

  prompts.push({
    type: 'list',
    name: 'templateType',
    message: 'Which app configuration do you want?',
    choices: ['MongoDB', 'SQL'],
  })

  const answers = await inquirer.prompt(prompts)
  const appName = appNameArg ?? (answers['appName'] as string)
  const templateType = answers['templateType'] as string

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

  await fs.mkdir(appDir)

  try {
    const repo = templateType === 'MongoDB' ? MONGO_TEMPLATE_REPO : SQL_TEMPLATE_REPO
    await setupAppConfiguration(appDir, appName, repo)
  } catch (error) {
    console.error('Error creating app:', error)
    console.log(chalk.yellow('Make sure git is available on your CLI before running this command.'))
    await fs.rm(appDir, { recursive: true, force: true })
    process.exit(1)
  }
}

async function setupAppConfiguration(appDir: string, appName: string, repo: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const gitSetup = spawn('git', ['clone', '--depth', '1', '--progress', repo, appDir])

    gitSetup.stderr.on('data', (data: Buffer) => {
      const output = data.toString()
      if (!output.includes('Cloning into')) {
        console.log(chalk.gray(output))
      }
    })

    gitSetup.on('close', (code: number | null) => {
      if (code === 0) {
        console.log(chalk.green(`App "${appName}" created successfully!`))
        const gitFolderPath = path.join(appDir, '.git')
        fs.rm(gitFolderPath, { recursive: true, force: true })
          .then(() => resolve())
          .catch(reject)
      } else {
        console.log(chalk.red(`Failed to create the app with exit code ${code}.`))
        reject(new Error(`git clone failed with exit code ${code}`))
      }
    })
  })
}

async function generateResource(
  type: string,
  name: string,
  opts: { dryRun: boolean; orm?: string; out?: string },
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
  opts: { dryRun: boolean; orm?: string; out?: string },
): Promise<void> {
  let ormChoice: OrmChoice
  const raw = opts.orm?.toLowerCase()
  if (raw === 'typeorm' || raw === 'mongoose' || raw === 'none') {
    ormChoice = raw
  } else if (opts.orm !== undefined) {
    console.log(chalk.red(`Invalid --orm "${opts.orm}". Use typeorm, mongoose, or none.`))
    process.exit(1)
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

  const outBase = path.join(process.cwd(), opts.out ?? 'src')
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
}
