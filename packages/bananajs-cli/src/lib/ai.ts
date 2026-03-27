import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'

export interface AiGenerateOptions {
  fromSchema?: string
  fromPrompt?: string
  out?: string
  dryRun?: boolean
}

export interface AiDocOptions {
  file?: string
  dryRun?: boolean
}

export interface AiReviewOptions {
  file?: string
}

type SchemaProperties = Record<string, { type?: string }>

interface ParsedSchema {
  entityName: string
  fields: Array<{ name: string; type: string }>
}

const GENERATE_SYSTEM_PROMPT =
  'You are a BananaJS expert code generator. BananaJS uses decorators for routing.\n' +
  'Generate TypeScript code for BananaJS controller, DTO, and service.\n' +
  'Return ONLY three code blocks labeled with triple backticks and "typescript".'

function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)/g, (_, c: string) => (c as string).toUpperCase())
    .replace(/^(.)/, (_, c: string) => (c as string).toUpperCase())
}

function mapJsonTypeToTs(jsonType: string | undefined): string {
  switch (jsonType) {
    case 'integer':
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'array':
      return 'unknown[]'
    default:
      return 'string'
  }
}

function parseSchema(content: string, filePath: string): ParsedSchema {
  const parsed = JSON.parse(content) as Record<string, unknown>
  let entityName: string
  let properties: SchemaProperties = {}

  if (parsed['components'] && typeof parsed['components'] === 'object') {
    const components = parsed['components'] as {
      schemas?: Record<string, { properties?: SchemaProperties }>
    }
    const schemas = components.schemas ?? {}
    const firstKey = Object.keys(schemas)[0]
    entityName = firstKey
      ? toPascalCase(firstKey)
      : toPascalCase(path.basename(filePath, path.extname(filePath)))
    properties = firstKey ? schemas[firstKey].properties ?? {} : {}
  } else {
    const title = typeof parsed['title'] === 'string' ? parsed['title'] : undefined
    entityName = title
      ? toPascalCase(title)
      : toPascalCase(path.basename(filePath, path.extname(filePath)))
    properties = (parsed['properties'] as SchemaProperties | undefined) ?? {}
  }

  const fields = Object.entries(properties).map(([name, def]) => ({
    name,
    type: mapJsonTypeToTs(def.type),
  }))

  return { entityName, fields }
}

function generateControllerTemplate(entityName: string, _fields: string[]): string {
  return `import { Controller, Get, Post, Put, Delete, Body, Params } from '@banana-universe/bananajs'
import { ${entityName}Dto } from './${entityName.toLowerCase()}.dto.js'

@Controller('/${entityName.toLowerCase()}s')
export class ${entityName}Controller {
  @Get('/')
  async getAll() {
    // TODO: implement
  }

  @Get('/:id')
  async getById(@Params(${entityName}Dto) params: { id: string }) {
    // TODO: implement
  }

  @Post('/')
  async create(@Body(${entityName}Dto) body: ${entityName}Dto) {
    // TODO: implement
  }

  @Put('/:id')
  async update(@Params(${entityName}Dto) params: { id: string }, @Body(${entityName}Dto) body: Partial<${entityName}Dto>) {
    // TODO: implement
  }

  @Delete('/:id')
  async delete(@Params(${entityName}Dto) params: { id: string }) {
    // TODO: implement
  }
}
`
}

function generateDtoTemplate(
  entityName: string,
  fields: Array<{ name: string; type: string }>,
): string {
  const fieldLines = fields.map((f) => `  @IsOptional()\n  ${f.name}?: ${f.type}`).join('\n\n')
  return `import { IsOptional } from 'class-validator'

export class ${entityName}Dto {
${fieldLines || '  // TODO: add fields'}
}
`
}

function generateServiceTemplate(entityName: string): string {
  return `import { Injectable } from '@banana-universe/bananajs'

@Injectable()
export class ${entityName}Service {
  // TODO: inject repository and implement business logic
}
`
}

async function writeOrPrint(filePath: string, content: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log(chalk.cyan(`[dry-run] Would create: ${filePath}`))
    console.log(chalk.gray('---'))
    console.log(chalk.gray(content))
    return
  }
  await fs.writeFile(filePath, content, 'utf-8')
  console.log(chalk.green(`Created: ${filePath}`))
}

async function findControllerFiles(dir: string): Promise<string[]> {
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
      const nested = await findControllerFiles(fullPath)
      results.push(...nested)
    } else if (entry.isFile() && entry.name.endsWith('.controller.ts')) {
      results.push(fullPath)
    }
  }
  return results
}

async function generateFromSchema(opts: AiGenerateOptions): Promise<void> {
  const schemaPath = opts.fromSchema!
  let content: string
  try {
    content = await fs.readFile(schemaPath, 'utf-8')
  } catch {
    console.error(chalk.red(`File not found: ${schemaPath}`))
    process.exit(1)
  }

  let parsed: ParsedSchema
  try {
    parsed = parseSchema(content, schemaPath)
  } catch {
    console.error(chalk.red(`Failed to parse schema: ${schemaPath}`))
    process.exit(1)
  }

  const { entityName, fields } = parsed
  const outDir = opts.out ?? process.cwd()
  const dryRun = opts.dryRun ?? false

  await writeOrPrint(
    path.join(outDir, `${entityName.toLowerCase()}.controller.ts`),
    generateControllerTemplate(
      entityName,
      fields.map((f) => f.name),
    ),
    dryRun,
  )
  await writeOrPrint(
    path.join(outDir, `${entityName.toLowerCase()}.dto.ts`),
    generateDtoTemplate(entityName, fields),
    dryRun,
  )
  await writeOrPrint(
    path.join(outDir, `${entityName.toLowerCase()}.service.ts`),
    generateServiceTemplate(entityName),
    dryRun,
  )
}

async function generateFromPrompt(opts: AiGenerateOptions): Promise<void> {
  if (!process.env['OPENAI_API_KEY']) {
    console.error(chalk.yellow('Set OPENAI_API_KEY to use AI commands.'))
    return
  }

  const aiModule = await import('ai').catch(() => null)
  if (!aiModule) {
    console.error(chalk.yellow('Install Vercel AI SDK: npm install ai @ai-sdk/openai'))
    return
  }

  const openaiModule = await import('@ai-sdk/openai').catch(() => null)
  if (!openaiModule) {
    console.error(chalk.yellow('Install Vercel AI SDK: npm install ai @ai-sdk/openai'))
    return
  }

  let text: string
  try {
    const result = await aiModule.generateText({
      model: openaiModule.openai('gpt-4o-mini'),
      system: GENERATE_SYSTEM_PROMPT,
      prompt: opts.fromPrompt!,
    })
    text = result.text
  } catch (err) {
    console.error(chalk.red('AI generation failed:'), err)
    return
  }

  const codeBlockRegex = /```typescript\n([\s\S]*?)```/g
  const blocks: string[] = []
  let match: RegExpExecArray | null
  while ((match = codeBlockRegex.exec(text)) !== null) {
    blocks.push(match[1])
  }

  const promptWords = (opts.fromPrompt ?? '').split(/\s+/)
  const entityName = toPascalCase(promptWords[0] ?? 'Entity')
  const outDir = opts.out ?? process.cwd()
  const dryRun = opts.dryRun ?? false

  if (blocks.length >= 3) {
    await writeOrPrint(
      path.join(outDir, `${entityName.toLowerCase()}.controller.ts`),
      blocks[0],
      dryRun,
    )
    await writeOrPrint(path.join(outDir, `${entityName.toLowerCase()}.dto.ts`), blocks[1], dryRun)
    await writeOrPrint(
      path.join(outDir, `${entityName.toLowerCase()}.service.ts`),
      blocks[2],
      dryRun,
    )
  } else {
    console.log(chalk.yellow('AI returned fewer than 3 code blocks; using fallback templates.'))
    await writeOrPrint(
      path.join(outDir, `${entityName.toLowerCase()}.controller.ts`),
      generateControllerTemplate(entityName, []),
      dryRun,
    )
    await writeOrPrint(
      path.join(outDir, `${entityName.toLowerCase()}.dto.ts`),
      generateDtoTemplate(entityName, []),
      dryRun,
    )
    await writeOrPrint(
      path.join(outDir, `${entityName.toLowerCase()}.service.ts`),
      generateServiceTemplate(entityName),
      dryRun,
    )
  }
}

export async function aiGenerate(opts: AiGenerateOptions): Promise<void> {
  if (opts.fromSchema) {
    await generateFromSchema(opts)
    return
  }

  if (opts.fromPrompt) {
    await generateFromPrompt(opts)
    return
  }

  console.error(chalk.red('Specify --from-schema <file> or --from-prompt <text>'))
}

export async function aiDoc(opts: AiDocOptions): Promise<void> {
  if (!process.env['OPENAI_API_KEY']) {
    console.error(chalk.yellow('Set OPENAI_API_KEY to use AI commands.'))
    return
  }

  const aiModule = await import('ai').catch(() => null)
  if (!aiModule) {
    console.error(chalk.yellow('Install Vercel AI SDK: npm install ai @ai-sdk/openai'))
    return
  }

  const openaiModule = await import('@ai-sdk/openai').catch(() => null)
  if (!openaiModule) {
    console.error(chalk.yellow('Install Vercel AI SDK: npm install ai @ai-sdk/openai'))
    return
  }

  let files: string[]
  if (opts.file) {
    files = [opts.file]
  } else {
    const srcDir = path.join(process.cwd(), 'src')
    try {
      files = await findControllerFiles(srcDir)
    } catch {
      console.error(chalk.red(`Could not scan src/ directory: ${srcDir}`))
      return
    }
  }

  if (files.length === 0) {
    console.log(chalk.yellow('No controller files found.'))
    return
  }

  for (const filePath of files) {
    let content: string
    try {
      content = await fs.readFile(filePath, 'utf-8')
    } catch {
      console.error(chalk.red(`File not found: ${filePath}`))
      continue
    }

    console.log(chalk.blue(`Processing: ${filePath}`))

    let result: { text: string }
    try {
      result = await aiModule.generateText({
        model: openaiModule.openai('gpt-4o-mini'),
        system:
          'You are a BananaJS expert. Add JSDoc comments to each method in this controller. Return ONLY the updated file content.',
        prompt: content,
      })
    } catch (err) {
      console.error(chalk.red(`Failed to process ${filePath}:`), err)
      continue
    }

    if (opts.dryRun) {
      console.log(chalk.cyan(`[dry-run] Updated content for: ${filePath}`))
      console.log(chalk.gray('---'))
      console.log(chalk.gray(result.text))
    } else {
      await fs.writeFile(filePath, result.text, 'utf-8')
      console.log(chalk.green(`Updated: ${filePath}`))
    }
  }
}

export async function aiReview(opts: AiReviewOptions): Promise<void> {
  if (!opts.file) {
    console.error(chalk.red('Specify --file <path> to review a controller file.'))
    return
  }

  if (!process.env['OPENAI_API_KEY']) {
    console.error(chalk.yellow('Set OPENAI_API_KEY to use AI commands.'))
    return
  }

  let content: string
  try {
    content = await fs.readFile(opts.file, 'utf-8')
  } catch {
    console.error(chalk.red(`File not found: ${opts.file}`))
    process.exit(1)
  }

  const aiModule = await import('ai').catch(() => null)
  if (!aiModule) {
    console.error(chalk.yellow('Install Vercel AI SDK: npm install ai @ai-sdk/openai'))
    return
  }

  const openaiModule = await import('@ai-sdk/openai').catch(() => null)
  if (!openaiModule) {
    console.error(chalk.yellow('Install Vercel AI SDK: npm install ai @ai-sdk/openai'))
    return
  }

  let result: { text: string }
  try {
    result = await aiModule.generateText({
      model: openaiModule.openai('gpt-4o-mini'),
      system:
        'Review this BananaJS controller for best practices, security issues, naming conventions, and improvements. Be concise and actionable.',
      prompt: content,
    })
  } catch (err) {
    console.error(chalk.red('AI review failed:'), err)
    return
  }

  console.log(chalk.bold.blue(`\nAI Review: ${opts.file}\n`))
  console.log(result.text)
}
