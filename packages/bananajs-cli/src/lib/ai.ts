import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import { loadBananarc } from './llm/bananarc.js'
import { appendBananaJsAiRules } from './llm/bananajs-ai-rules.js'
import { resolveLlmProvider } from './llm/provider.factory.js'
import { LEGACY_FLAT_GENERATE_SYSTEM_PROMPT } from './llm/prompts/generate-from-prompt.js'
import { parseSchema } from './schema-parse.js'
import {
  generateControllerTemplate,
  generateDtoTemplate,
  generateServiceTemplate,
} from './templates/legacy-scaffold.js'
import { toPascalCase } from './utils/naming.js'

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

  let parsed: ReturnType<typeof parseSchema>
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
  const cwd = process.cwd()
  const config = await loadBananarc(cwd)
  const provider = resolveLlmProvider(config)

  let text: string
  try {
    text = await provider.generate(opts.fromPrompt!, {
      system: LEGACY_FLAT_GENERATE_SYSTEM_PROMPT,
      temperature: 0.2,
    })
  } catch (err) {
    console.error(chalk.red('AI generation failed:'), err)
    return
  }

  // Try single-block named-delimiter format first: one code block with // === FILE: <name> === markers
  const outerBlockRe = /```(?:typescript|ts)\n([\s\S]*?)```/
  const outerMatch = outerBlockRe.exec(text)
  let controllerSrc: string | undefined
  let dtoSrc: string | undefined
  let serviceSrc: string | undefined

  if (outerMatch) {
    const body = outerMatch[1]
    const sectionRe = /\/\/ === FILE: (controller|dto|service) ===\n([\s\S]*?)(?=\/\/ === FILE:|$)/g
    let sec: RegExpExecArray | null
    while ((sec = sectionRe.exec(body)) !== null) {
      const secName = sec[1]
      const secContent = (sec[2] ?? '').trim()
      if (secName === 'controller') controllerSrc = secContent
      else if (secName === 'dto') dtoSrc = secContent
      else if (secName === 'service') serviceSrc = secContent
    }
  }

  // Legacy fallback: 3 separate code blocks (old prompt format)
  if (!controllerSrc || !dtoSrc || !serviceSrc) {
    const codeBlockRegex = /```(?:typescript|ts)\n([\s\S]*?)```/g
    const blocks: string[] = []
    let match: RegExpExecArray | null
    while ((match = codeBlockRegex.exec(text)) !== null) {
      blocks.push(match[1])
    }
    if (blocks.length >= 3) {
      controllerSrc = blocks[0]
      dtoSrc = blocks[1]
      serviceSrc = blocks[2]
    }
  }

  const promptWords = (opts.fromPrompt ?? '').split(/\s+/)
  const entityName = toPascalCase(promptWords[0] ?? 'Entity')
  const outDir = opts.out ?? process.cwd()
  const dryRun = opts.dryRun ?? false

  if (controllerSrc && dtoSrc && serviceSrc) {
    await writeOrPrint(
      path.join(outDir, `${entityName.toLowerCase()}.controller.ts`),
      controllerSrc,
      dryRun,
    )
    await writeOrPrint(path.join(outDir, `${entityName.toLowerCase()}.dto.ts`), dtoSrc, dryRun)
    await writeOrPrint(
      path.join(outDir, `${entityName.toLowerCase()}.service.ts`),
      serviceSrc,
      dryRun,
    )
  } else {
    console.log(chalk.yellow('AI returned fewer than 3 code sections; using fallback templates.'))
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
  console.log(
    chalk.yellow(
      '[ai doc] Deprecation path: prefer OpenAPI export + API docs over JSDoc injection. See docs-site AI hub for timeline and alternatives.',
    ),
  )
  const cwd = process.cwd()
  const config = await loadBananarc(cwd)
  const provider = resolveLlmProvider(config)

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

    let resultText: string
    try {
      resultText = await provider.generate(content, {
        system: appendBananaJsAiRules(
          'You are a BananaJS expert technical writer. Add comprehensive JSDoc comments to every public method in this TypeScript controller file.\n\n' +
          'For each route method, write:\n' +
          '- @description \u2014 a clear one-sentence explanation of what the route does and its business purpose\n' +
          '- @param \u2014 for each method argument; for @Body(Schema)/@Query(Schema)/@Params(Schema) parameters list each Zod schema key as `@param {type} body.fieldName description` (or @query / @param prefix matching the decorator)\n' +
          '- @returns \u2014 for `this.ok(data)` describe the shape as `SuccessResponse<EntityType>` with `{ success: true, data: EntityType }`; for `this.error(err)` document the `ApiError` shape\n' +
          '- @throws \u2014 list known error cases with HTTP status codes: BadRequestError (400), NotFoundError (404), ConflictError (409), UnauthorizedError (401), ForbiddenError (403)\n' +
          '- @example \u2014 for the primary POST/create endpoint include a minimal valid request body JSON example\n\n' +
          'CRITICAL: Return ONLY the complete updated TypeScript source file. Do NOT wrap the output in markdown code fences (no ```typescript, no ``` of any kind). No commentary before or after.',
        ),
        temperature: 0.2,
      })
    } catch (err) {
      console.error(chalk.red(`Failed to process ${filePath}:`), err)
      continue
    }

    if (opts.dryRun) {
      console.log(chalk.cyan(`[dry-run] Updated content for: ${filePath}`))
      console.log(chalk.gray('---'))
      console.log(chalk.gray(resultText))
    } else {
      await fs.writeFile(filePath, resultText, 'utf-8')
      console.log(chalk.green(`Updated: ${filePath}`))
    }
  }
}

export { runAiReview } from './ai-review-run.js'
export type { AiReviewCliOptions } from './ai-review-run.js'
