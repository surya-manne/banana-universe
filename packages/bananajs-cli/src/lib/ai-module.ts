import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import inquirer from 'inquirer'
import {
  findBootstrapRelativePath,
  patchTypeormEntitiesArray,
  registerModuleInBootstrap,
} from './bootstrap-patch.js'
import { loadBananarc } from './llm/bananarc.js'
import { resolveLlmProvider } from './llm/provider.factory.js'
import { appendBananaJsAiRules } from './llm/bananajs-ai-rules.js'
import { ENTITY_EXTRACTION_SYSTEM } from './llm/prompts/extraction.js'
import {
  tryParseJsonObject,
  validateEntityExtraction,
  type EntityExtraction,
} from './llm/entity-extraction.js'
import { buildDddModuleFromExtraction } from './generate-ai-module.js'
import type { OrmChoice } from './generate-module.js'
import { moduleExportName, moduleOutputBase, toKebabCase, toPascalCase } from './generate-module.js'
import { parseSchema, type ParsedSchema } from './schema-parse.js'
import { PRESET_ORM_HELP, presetIdToOrm } from './preset-orm.js'

export interface AiModuleGenerateOptions {
  /** Natural language module description, or `true` when `--module` is passed with no value (TTY prompts) */
  module?: string | boolean
  fromSchema?: string
  orm?: string
  /** Same as `ban new --preset`: mongodb → mongoose, sql → typeorm; overridden by `--orm`. */
  preset?: string
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
      return validateEntityExtraction(parsed)
    } catch (e) {
      lastErr = e
      if (debug && attempt === 0) {
        console.log(
          chalk.yellow(`Extraction parse/validation failed (attempt ${attempt + 1}), retrying…`),
        )
      }
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr)
  if (msg.includes('LLM returned unparseable JSON')) {
    console.error(chalk.red('LLM returned unparseable JSON. Use --debug to see raw output.'))
  } else {
    console.error(chalk.red(`Extraction failed: ${msg}`))
  }
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
    const isAppService =
      f.relativePath.includes('/application/') && f.relativePath.endsWith('.service.ts')
    if (!isAppService) {
      result.push(f)
      continue
    }
    try {
      const refined = await provider.generate(
        `Fill in TODO and stub methods with minimal realistic logic. Keep imports and exports. Output ONLY the full TypeScript source file, no markdown.\n\n${f.content}`,
        {
          system: appendBananaJsAiRules(
            'You are a BananaJS expert. Return a single valid TypeScript module. No markdown fences.',
          ),
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

/**
 * When TTY and `--module` is used without schema or description, prompt for source (schema path vs text).
 */
export async function promptAiModuleInputs(
  opts: AiModuleGenerateOptions,
): Promise<AiModuleGenerateOptions> {
  const hasSchema = typeof opts.fromSchema === 'string' && opts.fromSchema.trim().length > 0
  const hasText = typeof opts.module === 'string' && opts.module.trim().length > 0
  const bareModuleFlag = opts.module === true || opts.module === ''
  if (hasSchema || hasText) {
    return opts
  }
  if (!bareModuleFlag) {
    return opts
  }
  if (!process.stdin.isTTY) {
    console.error(
      chalk.red(
        'Non-interactive mode: pass --from-schema <file> or --module "<description>" (or use flags from `bjs ai generate --help`).',
      ),
    )
    process.exit(1)
  }

  const answers = await inquirer.prompt<{
    mode: 'schema' | 'text'
    fromSchema?: string
    description?: string
    orm: OrmChoice
    detailed: boolean
    dryRun: boolean
  }>([
    {
      type: 'list',
      name: 'mode',
      message: 'Generate DDD module from:',
      choices: [
        { name: 'JSON / OpenAPI schema file', value: 'schema' },
        { name: 'Natural language description', value: 'text' },
      ],
    },
    {
      type: 'input',
      name: 'fromSchema',
      message: 'Path to schema file (relative to project root):',
      when: (a) => a.mode === 'schema',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Describe the feature / aggregate:',
      when: (a) => a.mode === 'text',
    },
    {
      type: 'list',
      name: 'orm',
      message: 'ORM adapter:',
      choices: [
        { name: 'Mongoose', value: 'mongoose' },
        { name: 'TypeORM', value: 'typeorm' },
        { name: 'None (in-memory stub)', value: 'none' },
      ],
      default: 'mongoose',
      when: () => opts.orm === undefined,
    },
    {
      type: 'confirm',
      name: 'detailed',
      message: 'Run second LLM pass (--detailed) to flesh out application service bodies?',
      default: false,
      when: () => opts.detailed === undefined,
    },
    {
      type: 'confirm',
      name: 'dryRun',
      message: 'Dry-run only (print files, do not write)?',
      default: false,
      when: () => opts.dryRun === undefined,
    },
  ])

  const mergedOrm = opts.orm ?? answers.orm
  const mergedDetailed = opts.detailed ?? answers.detailed ?? false
  const mergedDryRun = opts.dryRun ?? answers.dryRun ?? false

  if (answers.mode === 'schema') {
    const p = answers.fromSchema?.trim()
    if (!p) {
      console.error(chalk.red('Schema path is required.'))
      process.exit(1)
    }
    return {
      ...opts,
      fromSchema: p,
      orm: mergedOrm,
      detailed: mergedDetailed,
      dryRun: mergedDryRun,
      module: undefined,
    }
  }

  const description = answers.description?.trim()
  if (!description) {
    console.error(chalk.red('Description is required.'))
    process.exit(1)
  }
  return {
    ...opts,
    module: description,
    orm: mergedOrm,
    detailed: mergedDetailed,
    dryRun: mergedDryRun,
    fromSchema: undefined,
  }
}

export async function aiGenerateModule(opts: AiModuleGenerateOptions): Promise<void> {
  opts = await promptAiModuleInputs(opts)
  const cwd = opts.cwd ?? process.cwd()
  const config = await loadBananarc(cwd)
  const defaultOrm = resolveOrm(config.generate?.defaultOrm, 'typeorm')
  let fallback = defaultOrm
  if (opts.preset) {
    const mapped = presetIdToOrm(opts.preset)
    if (!mapped) {
      console.error(chalk.red(`Invalid --preset "${opts.preset}". Use: ${PRESET_ORM_HELP}`))
      process.exit(1)
    }
    fallback = mapped
  }
  const orm = resolveOrm(opts.orm, fallback)
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
        'DDD module generation requires --from-schema <file> or --module "<description>", or run in a TTY for prompts.',
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

  if (opts.dryRun) {
    return
  }

  const kebab = toKebabCase(extraction.entityName)
  const Pascal = toPascalCase(extraction.entityName)
  const discovered = await findBootstrapRelativePath(cwd)
  const bootstrapRel = discovered ?? config.project?.bootstrap ?? 'src/bootstrap.ts'
  await registerModuleInBootstrap({
    cwd,
    bootstrapRelative: bootstrapRel,
    moduleFolderKebab: kebab,
    moduleExportName: moduleExportName(kebab),
    dryRun: false,
  })

  if (orm === 'typeorm') {
    const entityAbs = path.join(
      outBase,
      moduleOutputBase(kebab),
      'infrastructure',
      `${Pascal}.orm-entity.ts`,
    )
    await patchTypeormEntitiesArray({
      cwd,
      entityFileAbs: path.resolve(entityAbs),
      entityClassName: `${Pascal}OrmEntity`,
      dryRun: false,
    })
  }
}
