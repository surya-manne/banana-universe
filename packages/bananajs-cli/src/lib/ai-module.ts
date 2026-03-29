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
import { toCamelCase } from './utils/naming.js'
import { parseSchema, type ParsedSchema } from './schema-parse.js'
import { PRESET_ORM_HELP, presetIdToOrm } from './preset-orm.js'

export interface AiModuleGenerateOptions {
  /** Natural language module description, or `true` when `--module` is passed with no value (TTY prompts) */
  module?: string | boolean
  /** Entity/module name captured explicitly via TTY prompt — overrides the LLM-inferred entityName. */
  explicitName?: string
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

/** All timestamp/audit field name variants the ORM manages automatically — never let the LLM emit these. */
const AUTO_FIELDS =
  /^(_id|id|__v|__t|version|createdAt|updatedAt|deletedAt|createdDate|updatedDate|created_at|updated_at|dateCreated|dateUpdated|createdOn|updatedOn|modifiedAt|modifiedDate|modifiedOn|insertedAt|insertedDate)$/i

interface ExistingEntityContext {
  entityName: string
  fields: string[]
}

/**
 * Scan `<outBase>/modules/` for already-generated entity files and return a lightweight
 * summary (entity name + field names) so the LLM can apply proper normalisation.
 */
async function scanExistingModules(outBase: string): Promise<ExistingEntityContext[]> {
  const modulesDir = path.join(outBase, 'modules')
  try {
    const entries = await fs.readdir(modulesDir, { withFileTypes: true })
    const result: ExistingEntityContext[] = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const kebab = entry.name
      const Pascal = toPascalCase(kebab)
      const entityPath = path.join(modulesDir, kebab, 'domain', `${Pascal}.entity.ts`)
      const fields: string[] = []
      try {
        const content = await fs.readFile(entityPath, 'utf-8')
        // Extract field names from the `*Props` interface block
        const propsMatch = content.match(/interface\s+\w+Props\s*\{([^}]+)\}/)
        if (propsMatch) {
          for (const line of propsMatch[1].split('\n')) {
            const m = line.match(/^\s+(\w+)\??:/)
            if (m && !AUTO_FIELDS.test(m[1])) {
              fields.push(m[1])
            }
          }
        }
      } catch {
        // entity file not found — just record the module name
      }
      result.push({ entityName: Pascal, fields })
    }
    return result
  } catch {
    return []
  }
}

async function extractEntityWithLlm(
  provider: ReturnType<typeof resolveLlmProvider>,
  userDescription: string,
  debug: boolean,
  explicitName?: string,
  existingEntities?: ExistingEntityContext[],
): Promise<EntityExtraction> {
  let lastErr: unknown
  let rawOut = ''
  const nameHint = explicitName
    ? `The entity name is "${toPascalCase(explicitName)}" — use this exactly as "entityName" in your JSON.\n\n`
    : ''

  let existingContext = ''
  if (existingEntities && existingEntities.length > 0) {
    const lines = existingEntities.map((e) =>
      e.fields.length > 0
        ? `- ${e.entityName} (fields: ${e.fields.join(', ')})`
        : `- ${e.entityName}`,
    )
    existingContext =
      `\n\nExisting entities already in this project:\n${lines.join('\n')}\n\n` +
      `NORMALISATION RULE: Do NOT copy any fields from an existing entity into the new entity. ` +
      `Instead, add a camelCase foreign-key reference field (e.g. "${toCamelCase(existingEntities[0].entityName)}Id: string") ` +
      `to reference the sibling entity. Each piece of data must live in exactly one place.`
  }

  const prompt =
    nameHint +
    `Research the domain model for the following module or use-case and produce a complete, production-realistic field list:\n\n` +
    `"${userDescription}"\n\n` +
    `Even if the description is just a name or a brief phrase, apply your domain knowledge to enumerate ALL fields a real implementation would include. ` +
    existingContext +
    `\n\nRespond with JSON only — no markdown, no explanation.`
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      rawOut = await provider.generate(prompt, { system: ENTITY_EXTRACTION_SYSTEM, temperature: 0 })
      if (debug) {
        console.log(chalk.gray('--- LLM raw extraction output ---'))
        console.log(chalk.gray(rawOut))
        console.log(chalk.gray('--- end ---'))
      }
      const parsed = tryParseJsonObject(rawOut)
      const result = validateEntityExtraction(parsed)
      // Strip any auto-managed fields the LLM includes despite instructions
      result.fields = result.fields.filter((f) => !AUTO_FIELDS.test(f.name))
      // Enforce caller-provided entity name so file names are deterministic
      if (explicitName) result.entityName = toPascalCase(explicitName)
      return result
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

function ormMethodGuide(orm: OrmChoice): string {
  if (orm === 'typeorm') {
    return (
      'ORM \u2014 TypeORM repository methods in scope (repository is typed as `Repository<XOrmEntity>` in the constructor):\n' +
      '  \u2022 `this.repo.findAndCount({ where, skip, take })` \u2014 paginated list with total count\n' +
      '  \u2022 `this.repo.findOne({ where: { id } })` \u2014 find by id; returns null when not found\n' +
      '  \u2022 `this.repo.create(dto)` then `this.repo.save(entity)` \u2014 instantiate and persist new record\n' +
      '  \u2022 `this.repo.save({ id, ...changes })` \u2014 update existing record\n' +
      '  \u2022 `this.repo.delete(id)` \u2014 delete by primary key'
    )
  }
  if (orm === 'mongoose') {
    return (
      'ORM \u2014 Mongoose model methods in scope (model type is `Model<XyzDocument>` in the constructor):\n' +
      '  \u2022 `this.model.find(filter).skip(skip).limit(limit).lean()` \u2014 paginated list\n' +
      '  \u2022 `this.model.countDocuments(filter)` \u2014 total count for pagination\n' +
      '  \u2022 `this.model.findById(id).lean()` \u2014 find by id; returns null when not found\n' +
      '  \u2022 `this.model.create(dto)` \u2014 insert new document\n' +
      '  \u2022 `this.model.findByIdAndUpdate(id, update, { new: true })` \u2014 update and return updated doc\n' +
      '  \u2022 `this.model.findByIdAndDelete(id)` \u2014 delete by id\n' +
      '  Always use `.lean()` on read-only queries for performance.'
    )
  }
  return 'ORM \u2014 use the injected repository or in-memory store methods visible in the constructor.'
}

/** Optional second pass: ask LLM to flesh out domain + application service bodies. */
async function applyDetailedPass(
  provider: ReturnType<typeof resolveLlmProvider>,
  files: Array<{ relativePath: string; content: string }>,
  debug: boolean,
  orm: OrmChoice,
): Promise<Array<{ relativePath: string; content: string }>> {
  const result: Array<{ relativePath: string; content: string }> = []
  for (const f of files) {
    const isAppService =
      f.relativePath.includes('/application/') && f.relativePath.endsWith('.service.ts')
    if (!isAppService) {
      result.push(f)
      continue
    }
    const ormGuide = ormMethodGuide(orm)
    try {
      const refined = await provider.generate(
        `Implement the stub methods in this file:\n\n${f.content}`,
        {
          system: appendBananaJsAiRules(
            'You are a BananaJS DDD expert implementing the application service layer of a production module.\n' +
            'Replace every stub / TODO method with realistic, production-quality logic that:\n' +
            `- ${ormGuide}\n` +
            '- Throws the correct BananaJS error types for domain failures:\n' +
            '    \u2022 `new NotFoundError("<EntityName> not found")` when a record does not exist\n' +
            '    \u2022 `new ConflictError("<EntityName> already exists")` for duplicate key / unique constraint violations\n' +
            '    \u2022 `new BadRequestError("...")` for business-rule violations\n' +
            '- Does not add new imports that are not already in the file or resolvable from @banana-universe/bananajs\n' +
            '- Keeps the class structure, decorators, and exports exactly as-is\n' +
            'Return a single complete valid TypeScript source file. CRITICAL: no markdown fences, no commentary.',
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
    moduleName?: string
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
      name: 'moduleName',
      message: 'Module name (singular PascalCase, e.g. Product, OrderItem):',
      when: (a) => a.mode === 'text',
      validate: (v: string) => v.trim().length > 0 || 'Module name is required',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Extra context (optional — leave blank to auto-research from the module name):',
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

  const name = answers.moduleName?.trim() ?? ''
  if (!name) {
    console.error(chalk.red('Module name is required.'))
    process.exit(1)
  }
  const extra = answers.description?.trim() ?? ''
  return {
    ...opts,
    explicitName: name,
    module: extra.length > 0 ? `${name}: ${extra}` : name,
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

  // Read existing modules so the LLM can normalise cross-entity relationships
  const existingEntities = await scanExistingModules(outBase)

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
    extraction = await extractEntityWithLlm(
      provider,
      opts.module.trim(),
      opts.debug ?? false,
      opts.explicitName,
      existingEntities.length > 0 ? existingEntities : undefined,
    )
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
    files = await applyDetailedPass(provider, files, opts.debug ?? false, orm)
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
    moduleIndexAbs: path.join(outBase, 'modules', kebab, 'index.ts'),
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
