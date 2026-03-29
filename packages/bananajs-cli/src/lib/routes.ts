import * as fs from 'fs/promises'
import * as path from 'path'
import { joinRouteSegments } from '@banana-universe/bananajs'
import chalk from 'chalk'

interface RouteEntry {
  method: string
  fullPath: string
  controller: string
  handler: string
}

const HTTP_METHODS = ['Get', 'Post', 'Put', 'Patch', 'Delete'] as const

export async function listRoutes(rootDir = 'src'): Promise<void> {
  const srcDir = path.join(process.cwd(), rootDir)

  let sourceFiles: string[] = []
  try {
    sourceFiles = await findTsFiles(srcDir)
  } catch {
    console.log(chalk.yellow(`No "${srcDir}" directory found. Run from a BananaJS project root.`))
    return
  }

  const routes: RouteEntry[] = []

  for (const filePath of sourceFiles) {
    const content = await fs.readFile(filePath, 'utf-8').catch(() => '')
    if (!content) continue

    const controllerMatch = content.match(/@Controller\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/)
    if (!controllerMatch) continue

    const basePath = controllerMatch[1]

    const classMatch = content.match(/class\s+(\w+)/)
    const controllerName = classMatch ? classMatch[1] : path.basename(filePath, '.ts')

    for (const method of HTTP_METHODS) {
      const regex = new RegExp(`@${method}\\s*\\(\\s*['"\`]([^'"\`]*)['"\`]`, 'g')
      let match: RegExpExecArray | null
      while ((match = regex.exec(content)) !== null) {
        const afterDecorator = content.slice(match.index + match[0].length)
        const handlerMatch = afterDecorator.match(/^\s*(?:@\w+[^)]*\)\s*)*(?:async\s+)?(\w+)\s*\(/)
        const handlerName = handlerMatch ? handlerMatch[1] : 'unknown'

        routes.push({
          method: method.toUpperCase(),
          fullPath: joinRouteSegments(basePath, match[1]),
          controller: controllerName,
          handler: handlerName,
        })
      }
    }
  }

  if (routes.length === 0) {
    console.log(chalk.yellow(`No BananaJS routes found under ${srcDir}`))
    console.log(chalk.gray('Note: Static scan only detects routes with literal string paths.'))
    return
  }

  const methodWidth = 8
  const pathWidth = Math.max(40, ...routes.map((r) => r.fullPath.length + 2))
  const controllerWidth = Math.max(20, ...routes.map((r) => r.controller.length + 2))

  console.log(chalk.bold('\nRegistered Routes (static scan):'))
  console.log(
    chalk.gray(
      'METHOD'.padEnd(methodWidth) +
        'PATH'.padEnd(pathWidth) +
        'CONTROLLER'.padEnd(controllerWidth) +
        'HANDLER',
    ),
  )
  console.log(chalk.gray('─'.repeat(methodWidth + pathWidth + controllerWidth + 20)))

  for (const route of routes) {
    const methodColor =
      route.method === 'GET'
        ? chalk.green
        : route.method === 'POST'
        ? chalk.blue
        : route.method === 'PUT'
        ? chalk.yellow
        : route.method === 'PATCH'
        ? chalk.cyan
        : chalk.red

    console.log(
      methodColor(route.method.padEnd(methodWidth)) +
        chalk.white(route.fullPath.padEnd(pathWidth)) +
        chalk.gray(route.controller.padEnd(controllerWidth)) +
        chalk.gray(route.handler),
    )
  }

  console.log(chalk.gray(`\n${routes.length} route(s) found`))
  console.log(chalk.gray('Note: Static scan may miss dynamically constructed paths.'))
}

async function findTsFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
      const nested = await findTsFiles(fullPath)
      files.push(...nested)
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      files.push(fullPath)
    }
  }

  return files
}
