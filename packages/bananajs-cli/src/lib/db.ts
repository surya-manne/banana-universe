import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'

const execAsync = promisify(exec)

export async function dbStatus(): Promise<void> {
  const cwd = process.cwd()

  const typeormConfigs = ['data-source.ts', 'data-source.js', 'ormconfig.ts', 'ormconfig.js', 'ormconfig.json']
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

  let hasPrisma = false
  try {
    await fs.stat(path.join(cwd, 'prisma', 'schema.prisma'))
    hasPrisma = true
  } catch {
    // not found
  }

  if (!typeormConfig && !hasPrisma) {
    console.log(chalk.yellow('No TypeORM or Prisma configuration found in current directory.'))
    console.log(chalk.gray('TypeORM: create data-source.ts with a DataSource export'))
    console.log(chalk.gray('Prisma:  create prisma/schema.prisma'))
    return
  }

  if (typeormConfig) {
    console.log(chalk.bold('\nTypeORM Migration Status:'))
    console.log(chalk.gray(`Config: ${typeormConfig}`))
    try {
      const { stdout, stderr } = await execAsync(`npx typeorm migration:show -d ${typeormConfig}`, { cwd })
      if (stdout) console.log(stdout)
      if (stderr) console.log(chalk.gray(stderr))
    } catch (err) {
      const error = err as { stderr?: string; message?: string }
      console.log(chalk.red('TypeORM migration:show failed:'))
      console.log(chalk.red(error.stderr ?? error.message ?? String(err)))
      console.log(chalk.gray('Make sure TypeORM is installed: npm install typeorm'))
    }
  }

  if (hasPrisma) {
    console.log(chalk.bold('\nPrisma Migration Status:'))
    try {
      const { stdout, stderr } = await execAsync('npx prisma migrate status', { cwd })
      if (stdout) console.log(stdout)
      if (stderr) console.log(chalk.gray(stderr))
    } catch (err) {
      const error = err as { stderr?: string; message?: string }
      console.log(chalk.red('Prisma migrate status failed:'))
      console.log(chalk.red(error.stderr ?? error.message ?? String(err)))
      console.log(chalk.gray('Make sure Prisma is installed: npm install prisma @prisma/client'))
    }
  }
}
