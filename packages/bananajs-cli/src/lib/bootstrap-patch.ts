import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import { tryFormatFileWithPrettier } from './format-prettier.js'

/** Prefer src/bootstrap.ts, else scan under src/ for defineBananaAppOptions and modules. */
export async function findBootstrapRelativePath(cwd: string): Promise<string | null> {
  const direct = path.join(cwd, 'src', 'bootstrap.ts')
  try {
    await fs.access(direct)
    return 'src/bootstrap.ts'
  } catch {
    /* continue */
  }

  const srcRoot = path.join(cwd, 'src')
  const files: string[] = []
  async function walk(dir: string): Promise<void> {
    let entries: Awaited<ReturnType<typeof fs.readdir>>
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name)
      if (ent.isDirectory() && ent.name !== 'node_modules') await walk(full)
      else if (ent.isFile() && ent.name.endsWith('.ts')) files.push(full)
    }
  }
  await walk(srcRoot)

  for (const abs of files) {
    let content: string
    try {
      content = await fs.readFile(abs, 'utf-8')
    } catch {
      continue
    }
    if (content.includes('defineBananaAppOptions') && content.includes('modules:')) {
      return path.relative(cwd, abs).replace(/\\/g, '/')
    }
  }
  return null
}

function appendImportAfterLastImportBlock(source: string, importLine: string): string {
  const trimmed = importLine.trim()
  if (source.includes(trimmed)) return source
  const lines = source.split('\n')
  let lastImportIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (t.startsWith('import ')) lastImportIdx = i
    else if (lastImportIdx >= 0 && t !== '' && !t.startsWith('//')) break
  }
  if (lastImportIdx === -1) return `${importLine}\n${source}`
  lines.splice(lastImportIdx + 1, 0, importLine)
  return lines.join('\n')
}

/** Insert `moduleName` into the first `modules: [ ... ]` array if missing. */
export function insertIntoModulesArray(source: string, moduleName: string): string | null {
  const marker = 'modules:'
  const idx = source.indexOf(marker)
  if (idx === -1) return null
  const bracketStart = source.indexOf('[', idx)
  if (bracketStart === -1) return null
  let depth = 0
  let i = bracketStart
  for (; i < source.length; i++) {
    const c = source[i]
    if (c === '[') depth++
    else if (c === ']') {
      depth--
      if (depth === 0) break
    }
  }
  const inner = source.slice(bracketStart + 1, i)
  const re = new RegExp(`\\b${escapeRegex(moduleName)}\\b`)
  if (re.test(inner)) return source
  const trimmed = inner.trim()
  const newInner =
    trimmed.length === 0 ? `\n    ${moduleName}\n  ` : `${trimmed},\n    ${moduleName}\n  `
  return source.slice(0, bracketStart + 1) + newInner + source.slice(i)
}

function escapeRegex(s: string): string {
  return s.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
}

export interface RegisterModuleInBootstrapOptions {
  cwd: string
  bootstrapRelative: string
  /** e.g. products */
  moduleFolderKebab: string
  /** e.g. productsModule */
  moduleExportName: string
  dryRun?: boolean
}

/** Adds import and registers module in `modules: [...]` inside bootstrap. */
export async function registerModuleInBootstrap(
  opts: RegisterModuleInBootstrapOptions,
): Promise<boolean> {
  const bootstrapPath = path.join(opts.cwd, opts.bootstrapRelative)
  let source: string
  try {
    source = await fs.readFile(bootstrapPath, 'utf-8')
  } catch {
    console.log(
      chalk.yellow(`Skipping bootstrap registration: file not found (${opts.bootstrapRelative}).`),
    )
    return false
  }

  const importLine = `import { ${opts.moduleExportName} } from './modules/${opts.moduleFolderKebab}/index.js'`
  const withImport = appendImportAfterLastImportBlock(source, importLine)
  const withModules = insertIntoModulesArray(withImport, opts.moduleExportName)
  if (!withModules) {
    console.log(
      chalk.yellow(
        `Could not find modules: [...] in ${opts.bootstrapRelative}; add ${opts.moduleExportName} manually.`,
      ),
    )
    return false
  }

  if (opts.dryRun) {
    console.log(chalk.cyan(`[dry-run] Would update ${bootstrapPath}`))
    return true
  }
  await fs.writeFile(bootstrapPath, withModules, 'utf-8')
  console.log(chalk.green(`Updated bootstrap: ${bootstrapPath}`))
  const formatted = await tryFormatFileWithPrettier(bootstrapPath, opts.cwd)
  if (formatted) {
    console.log(chalk.gray('Formatted with Prettier.'))
  }
  return true
}

export interface PatchTypeormEntitiesOptions {
  cwd: string
  /** Absolute path to the generated `*.orm-entity.ts` file (under src/). */
  entityFileAbs: string
  /** e.g. ProductOrmEntity */
  entityClassName: string
  dryRun?: boolean
}

function esmRelativeImport(fromFileAbs: string, targetTsFileAbs: string): string {
  const targetBase = targetTsFileAbs.replace(/\.tsx?$/, '')
  let rel = path.relative(path.dirname(fromFileAbs), targetBase + '.js').replace(/\\/g, '/')
  if (!rel.startsWith('.')) rel = `./${rel}`
  return rel
}

/** Best-effort: add TypeORM entity import + `entities` array entry in a file under `src/` that already has `entities:`. */
export async function patchTypeormEntitiesArray(
  opts: PatchTypeormEntitiesOptions,
): Promise<boolean> {
  const srcRoot = path.join(opts.cwd, 'src')

  const tsFiles: string[] = []
  async function walk(dir: string): Promise<void> {
    let e: Awaited<ReturnType<typeof fs.readdir>>
    try {
      e = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of e) {
      const full = path.join(dir, ent.name)
      if (ent.isDirectory() && ent.name !== 'node_modules') await walk(full)
      else if (ent.isFile() && ent.name.endsWith('.ts')) tsFiles.push(full)
    }
  }
  await walk(srcRoot)

  for (const file of tsFiles) {
    let content: string
    try {
      content = await fs.readFile(file, 'utf-8')
    } catch {
      continue
    }
    if (!content.includes('entities:')) continue

    const entitiesIdx = content.indexOf('entities:')
    const slice = content.slice(entitiesIdx, entitiesIdx + 800)
    if (slice.includes(opts.entityClassName)) {
      console.log(chalk.gray(`TypeORM entities already reference ${opts.entityClassName}.`))
      return true
    }

    const entitiesMatch = content.match(/entities:\s*\[([\s\S]*?)\]/)
    if (!entitiesMatch) continue

    const inner = entitiesMatch[1] ?? ''
    if (inner.includes(opts.entityClassName)) return true

    const importPath = esmRelativeImport(file, opts.entityFileAbs)
    const importLine = `import { ${opts.entityClassName} } from '${importPath}'`

    const newInner =
      inner.trim() === '' ? opts.entityClassName : `${inner.trim()}, ${opts.entityClassName}`
    let updated = content.replace(entitiesMatch[0], `entities: [${newInner}]`)
    if (!updated.includes(`import { ${opts.entityClassName} }`)) {
      updated = appendImportAfterLastImportBlock(updated, importLine)
    }

    if (opts.dryRun) {
      console.log(chalk.cyan(`[dry-run] Would patch entities in ${path.relative(opts.cwd, file)}`))
      return true
    }
    await fs.writeFile(file, updated, 'utf-8')
    console.log(
      chalk.green(
        `Registered ${opts.entityClassName} in TypeORM entities (${path.relative(opts.cwd, file)})`,
      ),
    )
    return true
  }

  console.log(
    chalk.yellow(
      `Could not auto-patch TypeORM entities[]. Add ${opts.entityClassName} to your DataSource entities list.`,
    ),
  )
  return false
}
