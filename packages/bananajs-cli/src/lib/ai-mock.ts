import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import { loadBananarc } from './llm/bananarc.js'
import { appendBananaJsAiRules } from './llm/bananajs-ai-rules.js'
import { resolveLlmProvider } from './llm/provider.factory.js'

export interface AiMockOptions {
  schema?: string
  module?: string
  out?: string
  format?: 'ts' | 'json'
  dryRun?: boolean
  cwd?: string
}

// ─── Zod AST helpers (regex-based, no runtime Zod import required) ────────────

interface ZodField {
  name: string
  zodType: string // raw zod chain string, e.g. "z.string().min(1)"
}

/**
 * Extract field names and their Zod type strings from source text.
 * Handles both `z.object({...})` and loose `fieldName: z.xxx()` patterns.
 */
function extractZodFields(src: string): ZodField[] {
  const fields: ZodField[] = []
  // Match: identifier: z.<chain> (covers most Zod object literal lines)
  const lineRe = /^\s{2,}(\w+)\s*:\s*(z\.[^,\n]+)/gm
  let m: RegExpExecArray | null
  while ((m = lineRe.exec(src)) !== null) {
    fields.push({ name: m[1], zodType: m[2].trim().replace(/,\s*$/, '') })
  }
  return fields
}

/**
 * Infer a TypeScript literal or faker call for a field based on its name and Zod type.
 * Falls back to hardcoded type-based literals when @faker-js/faker is not available.
 */
function inferFakerOrLiteral(
  name: string,
  zodType: string,
  hasFaker: boolean,
): string {
  const lname = name.toLowerCase()

  // Enum: z.enum([...]) → pick first literal
  const enumMatch = zodType.match(/z\.enum\(\[([^\]]+)\]/)
  if (enumMatch) {
    const first = enumMatch[1].split(',')[0]?.trim().replace(/['"]/g, '')
    return `'${first ?? 'value'}'`
  }

  // Boolean
  if (zodType.startsWith('z.boolean')) return 'true'

  // Number / date coerce
  if (zodType.startsWith('z.number') || zodType.startsWith('z.coerce.number')) {
    return '1'
  }
  if (zodType.startsWith('z.coerce.date') || zodType.startsWith('z.date')) {
    return hasFaker ? 'faker.date.recent().toISOString()' : 'new Date().toISOString()'
  }

  // Array
  if (zodType.startsWith('z.array')) return '[]'

  // String — domain inference from field name
  if (!hasFaker) {
    // Hardcoded literals
    if (lname === 'id' || lname.endsWith('id')) return `'id-1'`
    if (lname === 'email') return `'user@example.com'`
    if (lname.includes('name')) return `'Sample Name'`
    if (lname.includes('url') || lname.includes('link')) return `'https://example.com'`
    if (lname.includes('phone')) return `'+15550001234'`
    if (lname.includes('description') || lname.includes('text') || lname.includes('content')) return `'Sample text'`
    if (lname.includes('date') || lname.includes('at')) return `new Date().toISOString()`
    if (lname.includes('count') || lname.includes('total') || lname.includes('amount')) return '0'
    return `'value'`
  }

  // faker-based
  if (lname === 'id' || lname.endsWith('id')) return 'faker.string.uuid()'
  if (lname === 'email') return 'faker.internet.email()'
  if (lname.includes('firstname') || lname === 'first') return 'faker.person.firstName()'
  if (lname.includes('lastname') || lname === 'last') return 'faker.person.lastName()'
  if (lname.includes('name')) return 'faker.person.fullName()'
  if (lname.includes('url') || lname.includes('image') || lname.includes('avatar')) return 'faker.internet.url()'
  if (lname.includes('phone')) return 'faker.phone.number()'
  if (lname.includes('description') || lname.includes('text') || lname.includes('content') || lname === 'body') return 'faker.lorem.sentence()'
  if (lname.includes('date') || lname.endsWith('at')) return 'faker.date.recent().toISOString()'
  if (lname.includes('count') || lname.includes('total') || lname.includes('amount')) return 'faker.number.int({ min: 0, max: 100 })'
  if (lname.includes('price') || lname.includes('cost') || lname.includes('fee')) return 'faker.commerce.price()'
  if (lname.includes('color') || lname.includes('colour')) return 'faker.color.human()'
  if (lname.includes('address') || lname.includes('street')) return 'faker.location.streetAddress()'
  if (lname.includes('city')) return 'faker.location.city()'
  if (lname.includes('country')) return 'faker.location.country()'
  if (lname.includes('zip') || lname.includes('postal')) return 'faker.location.zipCode()'

  return 'faker.string.alphanumeric(8)'
}

function buildTsFixture(
  entityName: string,
  dtoType: string,
  fields: ZodField[],
  hasFaker: boolean,
): string {
  const fakerImport = hasFaker ? `import { faker } from '@faker-js/faker'\n` : ''
  const lines = fields.map((f) => {
    const isOptional = f.zodType.includes('.optional()') || f.zodType.includes('.nullish()')
    const value = isOptional ? 'undefined' : inferFakerOrLiteral(f.name, f.zodType, hasFaker)
    return `  ${f.name}: ${value},`
  })

  return `${fakerImport}import type { ${dtoType} } from '../${entityName.toLowerCase()}.dto.js'

export const build${dtoType} = (overrides?: Partial<${dtoType}>): ${dtoType} => ({
${lines.join('\n')}
  ...overrides,
})
`
}

function buildJsonFixture(entityName: string, fields: ZodField[]): string {
  const obj: Record<string, unknown> = {}
  for (const f of fields) {
    const v = inferFakerOrLiteral(f.name, f.zodType, false)
    // Convert string literals to actual values for JSON
    if (v.startsWith("'") && v.endsWith("'")) {
      obj[f.name] = v.slice(1, -1)
    } else if (v === 'true') {
      obj[f.name] = true
    } else if (v === '1' || v === '0') {
      obj[f.name] = Number(v)
    } else {
      obj[f.name] = v.replace(/^new Date\(\)\.toISOString\(\)$/, new Date().toISOString())
    }
  }
  return JSON.stringify({ [entityName.toLowerCase()]: obj }, null, 2)
}

async function checkFakerInstalled(cwd: string): Promise<boolean> {
  const nodeModulesPath = path.join(cwd, 'node_modules', '@faker-js', 'faker')
  try {
    await fs.access(nodeModulesPath)
    return true
  } catch {
    return false
  }
}

/** Find all .ts files that contain Zod schema definitions in a directory. */
async function findZodFiles(dir: string): Promise<string[]> {
  const results: string[] = []
  let entries: Awaited<ReturnType<typeof fs.readdir>>
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return results
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...(await findZodFiles(fullPath)))
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      const content = await fs.readFile(fullPath, 'utf-8').catch(() => '')
      if (content.includes('z.object(') || content.includes('z.string(') || content.includes('ZodSchema')) {
        results.push(fullPath)
      }
    }
  }
  return results
}

async function processSchemaFile(
  schemaPath: string,
  opts: AiMockOptions,
  outDir: string,
  hasFaker: boolean,
  useLlm: boolean,
  cwd: string,
): Promise<void> {
  const src = await fs.readFile(schemaPath, 'utf-8')
  const fields = extractZodFields(src)

  if (fields.length === 0) {
    console.log(chalk.yellow(`  No Zod fields found in ${path.relative(cwd, schemaPath)} — skipping`))
    return
  }

  // Derive entity name from file name (e.g. create-user.dto.ts → CreateUser)
  const basename = path.basename(schemaPath, '.ts')
  const entityName = basename
    .split(/[-.]/)
    .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
    .replace(/Dto$/, '')
    .replace(/Schema$/, '')
  const dtoType = entityName.endsWith('Dto') ? entityName : `${entityName}Dto`

  let finalFields = fields

  // Optional LLM pass to assign better domain values
  if (useLlm && fields.length > 0) {
    try {
      const config = await loadBananarc(cwd)
      const provider = resolveLlmProvider(config)
      const system = appendBananaJsAiRules(
        'You are a fixture data generator for BananaJS DTOs. Given a list of Zod schema fields, return ONLY a JSON object mapping each field name to a single representative TypeScript value expression (a string literal, number literal, boolean, or faker call if @faker-js/faker is available). Return only valid JSON. No explanation.',
      )
      const fieldList = fields.map((f) => `${f.name}: ${f.zodType}`).join('\n')
      const raw = await provider.generate(`Fields:\n${fieldList}`, { system, temperature: 0.1 })
      const parsed = JSON.parse(raw.trim()) as Record<string, string>
      finalFields = fields.map((f) => ({
        name: f.name,
        zodType: parsed[f.name] !== undefined ? fields.find((ff) => ff.name === f.name)?.zodType ?? f.zodType : f.zodType,
      }))
    } catch {
      // LLM optional — fall back to static inference
    }
  }

  const format = opts.format ?? 'ts'
  const fixturesDir = path.join(outDir, '__fixtures__')

  if (format === 'ts' || format === 'json') {
    if (!opts.dryRun) {
      await fs.mkdir(fixturesDir, { recursive: true })
    }
  }

  if (format === 'ts') {
    const content = buildTsFixture(entityName, dtoType, finalFields, hasFaker)
    const outFile = path.join(fixturesDir, `${basename}.fixtures.ts`)
    if (opts.dryRun) {
      console.log(chalk.cyan(`  [dry-run] Would write: ${path.relative(cwd, outFile)}`))
      console.log(chalk.gray(content.split('\n').slice(0, 8).join('\n')))
    } else {
      await fs.writeFile(outFile, content, 'utf-8')
      console.log(chalk.green(`  ✔ ${path.relative(cwd, outFile)}`))
    }
  } else {
    const content = buildJsonFixture(entityName, finalFields)
    const outFile = path.join(fixturesDir, `${basename}.fixture.json`)
    if (opts.dryRun) {
      console.log(chalk.cyan(`  [dry-run] Would write: ${path.relative(cwd, outFile)}`))
      console.log(chalk.gray(content.slice(0, 200)))
    } else {
      await fs.writeFile(outFile, content, 'utf-8')
      console.log(chalk.green(`  ✔ ${path.relative(cwd, outFile)}`))
    }
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function runAiMock(opts: AiMockOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd()
  const hasFaker = await checkFakerInstalled(cwd)

  if (!hasFaker) {
    console.log(
      chalk.yellow('\n⚠  @faker-js/faker is not installed — using hardcoded type-based literals.'),
    )
    console.log(chalk.dim('   Install it for richer fixture data: npm install --save-dev @faker-js/faker'))
    console.log('')
  }

  let schemaFiles: string[] = []

  if (opts.schema) {
    const abs = path.resolve(cwd, opts.schema)
    try {
      await fs.access(abs)
      schemaFiles.push(abs)
    } catch {
      console.error(chalk.red(`Schema file not found: ${opts.schema}`))
      process.exit(1)
    }
  } else if (opts.module) {
    const moduleDir = path.resolve(cwd, opts.module)
    schemaFiles = await findZodFiles(moduleDir)
    if (schemaFiles.length === 0) {
      console.log(chalk.yellow(`No Zod schema files found in ${opts.module}`))
      return
    }
  } else {
    console.error(chalk.red('Pass --schema <file> or --module <path>'))
    process.exit(1)
  }

  const outDir = opts.out ? path.resolve(cwd, opts.out) : path.dirname(schemaFiles[0] ?? cwd)

  // LLM pass is opt-in (when a provider is configured and reachable) — run silently on failure
  const useLlm = false // static-only for default; users can extend via --llm flag in future

  console.log(chalk.bold.blue(`\nGenerating fixture factories (format: ${opts.format ?? 'ts'})\n`))

  for (const schemaFile of schemaFiles) {
    await processSchemaFile(schemaFile, opts, outDir, hasFaker, useLlm, cwd)
  }

  if (schemaFiles.length > 0 && !opts.dryRun) {
    console.log('')
    console.log(chalk.bold('Done.'))
  }
}
