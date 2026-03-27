#!/usr/bin/env node

import { Command } from 'commander'
import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import { spawn } from 'child_process'
import inquirer from 'inquirer'
import { generateController, generateDto, generateMiddleware } from './lib/generate'
import { listRoutes } from './lib/routes'
import { migrateCodemod } from './lib/migrate'
import { dbStatus } from './lib/db'
import { openapiExport } from './lib/openapi'

const MONGO_TEMPLATE_REPO = 'https://github.com/sprakas/bananajs-mongo-app-template.git'
const SQL_TEMPLATE_REPO = 'https://github.com/sprakas/bananajs-sql-app-template.git'

const program = new Command()

program
  .name('bananajs')
  .version('0.0.10')
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
  .description('Generate a BananaJS resource (controller | dto | middleware)')
  .option('--dry-run', 'Print files that would be created without writing them')
  .action((type: string, name: string, options: { dryRun?: boolean }) => {
    generateResource(type, name, options.dryRun ?? false).catch((err: unknown) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
  })

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
  .option('--status', 'Show ORM migration status (TypeORM/Prisma)')
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

program.parse(process.argv)

async function createApp(appNameArg?: string): Promise<void> {
  const prompts: { type: string; name: string; message: string; default?: string; choices?: string[] }[] = []

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

async function generateResource(type: string, name: string, dryRun: boolean): Promise<void> {
  const validTypes = ['controller', 'dto', 'middleware']
  if (!validTypes.includes(type)) {
    console.log(chalk.red(`Unknown type: "${type}". Valid types: ${validTypes.join(', ')}`))
    process.exit(1)
  }

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
