import chalk from 'chalk'
import inquirer from 'inquirer'
import { aiGenerateModule } from './ai-module.js'

/**
 * Interactive wizard for `bananajs ai generate --module` (TTY).
 * Non-TTY callers should pass flags explicitly (CI-safe).
 */
export async function runAiWizard(): Promise<void> {
  if (!process.stdin.isTTY) {
    console.error(
      chalk.red(
        'Interactive wizard requires a TTY. Use non-interactive flags, e.g. `bananajs ai generate --module "..." --orm typeorm`.',
      ),
    )
    process.exit(1)
  }

  const answers = await inquirer.prompt<{
    mode: 'schema' | 'text'
    fromSchema?: string
    description?: string
    orm: 'typeorm' | 'mongoose' | 'none'
    detailed: boolean
    dryRun: boolean
  }>([
    {
      type: 'list',
      name: 'mode',
      message: 'Generate DDD module from:',
      choices: [
        { name: 'JSON/OpenAPI schema file', value: 'schema' },
        { name: 'Natural language description', value: 'text' },
      ],
    },
    {
      type: 'input',
      name: 'fromSchema',
      message: 'Path to schema file (relative to cwd):',
      when: (a) => a.mode === 'schema',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Describe the feature / aggregate:',
      when: (a) => a.mode === 'text',
    },
    {
      type: 'list',
      name: 'orm',
      message: 'ORM adapter:',
      choices: [
        { name: 'TypeORM', value: 'typeorm' },
        { name: 'Mongoose', value: 'mongoose' },
        { name: 'None (stub)', value: 'none' },
      ],
      default: 'typeorm',
    },
    {
      type: 'confirm',
      name: 'detailed',
      message: 'Run second LLM pass (--detailed) to flesh out service bodies?',
      default: false,
    },
    {
      type: 'confirm',
      name: 'dryRun',
      message: 'Dry-run only (print files, do not write)?',
      default: false,
    },
  ])

  if (answers.mode === 'schema') {
    const schemaPath = answers.fromSchema?.trim()
    if (!schemaPath) {
      console.error(chalk.red('Schema path is required.'))
      process.exit(1)
    }
    await aiGenerateModule({
      fromSchema: schemaPath,
      orm: answers.orm,
      detailed: answers.detailed,
      dryRun: answers.dryRun,
    })
    return
  }

  const description = answers.description?.trim()
  if (!description) {
    console.error(chalk.red('Description is required.'))
    process.exit(1)
  }

  await aiGenerateModule({
    module: description,
    orm: answers.orm,
    detailed: answers.detailed,
    dryRun: answers.dryRun,
  })
}
