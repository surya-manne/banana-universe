import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'

export async function openapiExport(options: { out?: string; client?: string }): Promise<void> {
  const cwd = process.cwd()

  const candidates = [
    path.join(cwd, 'dist', 'openapi.json'),
    path.join(cwd, '.banana', 'openapi.json'),
    path.join(cwd, 'openapi.json'),
  ]

  let specContent: string | undefined
  let foundAt: string | undefined

  for (const candidate of candidates) {
    try {
      specContent = await fs.readFile(candidate, 'utf-8')
      foundAt = candidate
      break
    } catch {
      // not found
    }
  }

  if (!specContent || !foundAt) {
    console.log(chalk.red('No OpenAPI spec found.'))
    console.log(chalk.gray('Expected locations:'))
    candidates.forEach((c) => console.log(chalk.gray(`  ${c}`)))
    console.log(chalk.gray('\nMake sure your app is built and the swagger option is enabled:'))
    console.log(chalk.gray('  BananaApp.create([], { swagger: { enabled: true } })'))
    return
  }

  console.log(chalk.green(`Found spec: ${foundAt}`))

  const outPath = options.out ? path.resolve(cwd, options.out) : path.join(cwd, 'openapi.json')
  if (outPath !== foundAt) {
    await fs.writeFile(outPath, specContent, 'utf-8')
    console.log(chalk.green(`Exported to: ${outPath}`))
  } else {
    console.log(chalk.gray(`Spec already at: ${outPath}`))
  }

  if (options.client === 'typescript') {
    console.log(chalk.bold('\nGenerating TypeScript types...'))
    try {
      const openapiTs = await import('openapi-typescript')
      const generate =
        'default' in openapiTs ? (openapiTs as { default: unknown }).default : openapiTs

      if (typeof generate !== 'function') {
        throw new Error('openapi-typescript default export is not a function')
      }

      // openapi-typescript v7+ expects a URL, not a parsed object
      const specUrl = new URL(`file://${foundAt}`)
      const output = await (generate as (input: URL) => Promise<string>)(specUrl)
      const typesPath = outPath.replace(/\.json$/, '.d.ts')
      await fs.writeFile(typesPath, output, 'utf-8')
      console.log(chalk.green(`TypeScript types: ${typesPath}`))
    } catch (err) {
      const error = err as { message?: string }
      if (error.message?.includes('Cannot find module')) {
        console.log(chalk.red('openapi-typescript is not installed.'))
        console.log(chalk.gray('Install it: npm install -D openapi-typescript'))
      } else {
        console.log(chalk.red(`Client generation failed: ${error.message ?? String(err)}`))
      }
    }
  }
}
