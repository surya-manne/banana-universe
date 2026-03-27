import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'

const EXPRESS_ROUTE_PATTERNS = [
  /(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
]

export async function migrateCodemod(): Promise<void> {
  const srcDir = path.join(process.cwd(), 'src')

  let sourceFiles: string[] = []
  try {
    sourceFiles = await findAllFiles(srcDir)
  } catch {
    console.log(chalk.yellow('No src/ directory found. Run from a project root.'))
    return
  }

  let totalGenerated = 0

  for (const filePath of sourceFiles) {
    const content = await fs.readFile(filePath, 'utf-8').catch(() => '')
    if (!content) continue

    const routes: Array<{ method: string; routePath: string }> = []

    for (const pattern of EXPRESS_ROUTE_PATTERNS) {
      pattern.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = pattern.exec(content)) !== null) {
        routes.push({
          method: match[1].toUpperCase(),
          routePath: match[2],
        })
      }
    }

    if (routes.length === 0) continue

    const baseName = path.basename(filePath, path.extname(filePath))
    const controllerName = toPascalCase(baseName) + 'Controller'
    const outputPath = path.join(path.dirname(filePath), `${baseName}.controller.ts`)

    let exists = false
    try {
      await fs.stat(outputPath)
      exists = true
    } catch {
      // file doesn't exist — ok to create
    }

    if (exists) {
      console.log(chalk.yellow(`Skipping ${outputPath} (already exists)`))
      continue
    }

    const generated = generateControllerClass(controllerName, routes)
    await fs.writeFile(outputPath, generated, 'utf-8')

    console.log(chalk.green(`Generated: ${outputPath}`))
    console.log(chalk.gray(`  → ${routes.length} route(s) extracted from ${path.basename(filePath)}`))
    totalGenerated++
  }

  if (totalGenerated === 0) {
    console.log(chalk.yellow('No Express routes detected in src/ files.'))
    console.log(chalk.gray('Looking for: app.get(...), router.post(...), etc.'))
  } else {
    console.log(chalk.bold(`\nMigration complete: ${totalGenerated} controller(s) generated`))
    console.log(chalk.gray('Review generated files and fill in handler implementations.'))
  }
}

function generateControllerClass(
  controllerName: string,
  routes: Array<{ method: string; routePath: string }>,
): string {
  const basePath = routes[0]?.routePath.split('/').slice(0, 2).join('/') ?? '/'
  const methodImports = [
    ...new Set(routes.map((r) => r.method.charAt(0) + r.method.slice(1).toLowerCase())),
  ]
  const imports = `import { Controller, ${methodImports.join(', ')}, SuccessResponse } from '@banana-universe/bananajs'`
  const handlerMethods = routes
    .map((route, i) => {
      const handlerName = `handler${i + 1}`
      const decorator = `@${route.method.charAt(0) + route.method.slice(1).toLowerCase()}('${route.routePath}')`
      return `  ${decorator}\n  async ${handlerName}(req: Request, res: Response): Promise<void> {\n    new SuccessResponse('OK', {}).send(res)\n  }`
    })
    .join('\n\n')

  return `import { Request, Response } from 'express'\n${imports}\n\n@Controller('${basePath}')\nexport class ${controllerName} {\n${handlerMethods}\n}\n`
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

async function findAllFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
      files.push(...(await findAllFiles(fullPath)))
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) &&
      !entry.name.endsWith('.controller.ts')
    ) {
      files.push(fullPath)
    }
  }
  return files
}
