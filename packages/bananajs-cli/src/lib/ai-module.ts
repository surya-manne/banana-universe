import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import { loadBananarc } from './llm/bananarc.js'
import { resolveLlmProvider } from './llm/provider.factory.js'
import { ENTITY_EXTRACTION_SYSTEM } from './llm/prompts/extraction.js'
import {
  tryParseJsonObject,
  validateEntityExtraction,
  type EntityExtraction,
} from './llm/entity-extraction.js'
import { buildDddModuleFromExtraction } from './generate-ai-module.js'
import type { OrmChoice } from './generate-module.js'
import { parseSchema, type ParsedSchema } from './schema-parse.js'

export interface AiModuleGenerateOptions {
  /** Natural language module description */
  module?: string
  fromSchema?: string
  orm?: string
  out?: string
  dryRun?: boolean
  detailed?: boolean
  debug?: boolean
  cwd?: string
}

function schemaToExtraction(parsed: ParsedSchema): EntityExtraction {
  return {
    entityName: parsed.entityName,
    fields: parsed.fields.map((f) => ({ name: f.name, type: f.type })),
  }
}

function resolveOrm(raw: string | undefined, fallback: OrmChoice): OrmChoice {
  const v = raw?.toLowerCase()
  if (v === 'typeorm' || v === 'mongoose' || v === 'none') return v
  return fallback
}

async function extractEntityWithLlm(
  provider: ReturnType<typeof resolveLlmProvider>,
  userDescription: string,
  debug: boolean,
): Promise<EntityExtraction> {
  let lastErr: unknown
  let rawOut = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      rawOut = await provider.generate(
        `Describe the domain model for:\n\n${userDescription}\n\nRespond with JSON only.`,
        { system: ENTITY_EXTRACTION_SYSTEM, temperature: 0 },
      )
      if (debug) {
        console.log(chalk.gray('--- LLM raw extraction output ---'))
        console.log(chalk.gray(rawOut))
        console.log(chalk.gray('--- end ---'))
      }
      const parsed = tryParseJsonObject(rawOut)
      return await validateEntityExtraction(parsed)
    } catch (e) {
      lastErr = e
      if (debug && attempt === 0) {
        console.log(
          chalk.yellow(`Extraction parse/validation failed (attempt ${attempt + 1}), retrying…`),
        )
      }
    }
  }
  console.error(chalk.red('LLM returned unparseable JSON. Use --debug to see raw output.'))
  throw lastErr
}

async function writeFiles(
  baseDir: string,
  files: Array<{ relativePath: string; content: string }>,
  dryRun: boolean,
): Promise<void> {
  for (const f of files) {
    const outputPath = path.join(baseDir, f.relativePath)
    if (dryRun) {
      console.log(chalk.cyan(`[dry-run] Would create: ${outputPath}`))
      console.log(chalk.gray('---'))
      console.log(chalk.gray(f.content))
      continue
    }
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, f.content, 'utf-8')
    console.log(chalk.green(`Created: ${outputPath}`))
  }
}

/** Optional second pass: ask LLM to flesh out domain + application service bodies. */
async function applyDetailedPass(
  provider: ReturnType<typeof resolveLlmProvider>,
  files: Array<{ relativePath: string; content: string }>,
  debug: boolean,
): Promise<Array<{ relativePath: string; content: string }>> {
  const result: Array<{ relativePath: string; content: string }> = []
  for (const f of files) {
    const isService = f.relativePath.includes('/domain/') && f.relativePath.endsWith('.service.ts')
    const isApp = f.relativePath.includes('.app-service.ts')
    if (!isService && !isApp) {
      result.push(f)
      continue
    }
    try {
      const refined = await provider.generate(
        `Fill in TODO and stub methods with minimal realistic logic. Keep imports and exports. Output ONLY the full TypeScript source file, no markdown.\n\n${f.content}`,
        {
          system:
            'You are a BananaJS expert. Return a single valid TypeScript module. No markdown fences.',
          temperature: 0.2,
        },
      )
      let text = refined.trim()
      const fence = text.match(/```(?:typescript|ts)?\s*([\s\S]*?)```/)
      if (fence) text = (fence[1] ?? text).trim()
      result.push({ relativePath: f.relativePath, content: text })
    } catch (e) {
      if (debug) console.log(chalk.yellow(`--detailed pass skipped for ${f.relativePath}:`), e)
      result.push(f)
    }
  }
  return result
}

export async function aiGenerateModule(opts: AiModuleGenerateOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd()
  const config = await loadBananarc(cwd)
  const defaultOrm = resolveOrm(config.generate?.defaultOrm, 'typeorm')
  const orm = resolveOrm(opts.orm, defaultOrm)
  const outBase = path.resolve(cwd, opts.out ?? config.generate?.outDir ?? 'src')

  let extraction: EntityExtraction

  if (opts.fromSchema) {
    let content: string
    try {
      content = await fs.readFile(opts.fromSchema, 'utf-8')
    } catch {
      console.error(chalk.red(`File not found: ${opts.fromSchema}`))
      process.exit(1)
    }
    let parsed: ParsedSchema
    try {
      parsed = parseSchema(content, opts.fromSchema)
    } catch {
      console.error(chalk.red(`Failed to parse schema: ${opts.fromSchema}`))
      process.exit(1)
    }
    extraction = schemaToExtraction(parsed)
  } else if (typeof opts.module === 'string' && opts.module.trim().length > 0) {
    const provider = resolveLlmProvider(config)
    extraction = await extractEntityWithLlm(provider, opts.module.trim(), opts.debug ?? false)
  } else {
    console.error(
      chalk.red(
        'DDD module generation requires --from-schema <file> (optionally with bare --module) or --module "<description>".',
      ),
    )
    process.exit(1)
  }

  let files = buildDddModuleFromExtraction(extraction, orm)

  if (opts.detailed) {
    const provider = resolveLlmProvider(config)
    files = await applyDetailedPass(provider, files, opts.debug ?? false)
  }

  await writeFiles(outBase, files, opts.dryRun ?? false)
}
