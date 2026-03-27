import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'

const execAsync = promisify(exec)

async function readPackageJsonMongoose(cwd: string): Promise<boolean> {
  try {
    const raw = await fs.readFile(path.join(cwd, 'package.json'), 'utf-8')
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    return Boolean(deps.mongoose)
  } catch {
    return false
  }
}

export async function dbStatus(): Promise<void> {
  const cwd = process.cwd()

  const typeormConfigs = [
    'data-source.ts',
    'data-source.js',
    'ormconfig.ts',
    'ormconfig.js',
    'ormconfig.json',
  ]
  let typeormConfig: string | undefined
  for (const cfg of typeormConfigs) {
    try {
      await fs.stat(path.join(cwd, cfg))
      typeormConfig = cfg
      break
    } catch {
      // not found
    }
  }

  const hasMongoose = await readPackageJsonMongoose(cwd)

  if (!typeormConfig && !hasMongoose) {
    console.log(
      chalk.yellow('No TypeORM config or Mongoose dependency found in current directory.'),
    )
    console.log(chalk.gray('TypeORM: create data-source.ts with a DataSource export'))
    console.log(chalk.gray('Mongoose: add mongoose to package.json and connect in your bootstrap'))
    return
  }

  if (typeormConfig) {
    console.log(chalk.bold('\nTypeORM Migration Status:'))
    console.log(chalk.gray(`Config: ${typeormConfig}`))
    try {
      const { stdout, stderr } = await execAsync(`npx typeorm migration:show -d ${typeormConfig}`, {
        cwd,
      })
      if (stdout) console.log(stdout)
      if (stderr) console.log(chalk.gray(stderr))
    } catch (err) {
      const error = err as { stderr?: string; message?: string }
      console.log(chalk.red('TypeORM migration:show failed:'))
      console.log(chalk.red(error.stderr ?? error.message ?? String(err)))
      console.log(chalk.gray('Make sure TypeORM is installed: npm install typeorm'))
    }
  }

  if (hasMongoose) {
    console.log(chalk.bold('\nMongoose:'))
    console.log(
      chalk.gray(
        'No built-in migration status. Manage schemas in code (Mongoose models) and indexes explicitly if needed.',
      ),
    )
  }
}
