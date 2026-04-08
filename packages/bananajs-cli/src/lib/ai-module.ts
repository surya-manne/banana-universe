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
  USE_CASE_ANALYSIS_SYSTEM,
  buildContextAwareExtractionPrompt,
  buildContextAwareServicePrompt,
} from './llm/prompts/use-case-analysis.js'
import {
  tryParseUseCaseAnalysis,
  buildAnswersSummary,
  type UseCaseAnalysis,
  type UseCaseContext,
  UseCaseContextSchema,
} from './llm/use-case.js'
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
import { type BaseCtx, type LlmOperation, LlmOperationError, runLlmOperation } from './llm/pipeline.js'

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
  /**
   * When true, run use-case analysis and print the plan JSON to stdout, then exit.
   * No files are generated. Used by the `bananajs_plan_module` MCP tool.
   */
  planOnly?: boolean
  /**
   * JSON-serialised `UseCaseContext` produced by `--plan-only` + developer answers.
   * When provided, the use-case analysis step is skipped and this context is used
   * directly to drive domain-appropriate code generation.
   */
  context?: string
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
  useCaseContext?: UseCaseContext,
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

  const basePrompt =
    nameHint +
    `Research the domain model for the following module or use-case and produce a complete, production-realistic field list:\n\n` +
    `"${userDescription}"\n\n` +
    `Even if the description is just a name or a brief phrase, apply your domain knowledge to enumerate ALL fields a real implementation would include. ` +
    existingContext +
    `\n\nRespond with JSON only — no markdown, no explanation.`

  // When we have use-case context from the HITL planning step, build a richer, context-aware prompt
  // that tells the LLM about the actual operations and developer answers instead of assuming CRUD.
  const prompt = useCaseContext
    ? nameHint +
      buildContextAwareExtractionPrompt(
        userDescription,
        useCaseContext.analysis.summary,
        useCaseContext.analysis.operations,
        buildAnswersSummary(useCaseContext.analysis.questions, useCaseContext.answers),
      ) +
      existingContext +
      `\n\nRespond with JSON only — no markdown, no explanation.`
    : basePrompt

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
      // When context overrides entityName from analysis, apply it
      if (!explicitName && useCaseContext?.analysis.entityName) {
        result.entityName = toPascalCase(useCaseContext.analysis.entityName)
      }
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
  useCaseContext?: UseCaseContext,
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
      // When we have use-case context, use a domain-appropriate system prompt instead of the
      // generic CRUD-focused one so the detailed pass generates correct non-CRUD implementations.
      const systemPrompt = useCaseContext
        ? appendBananaJsAiRules(
            buildContextAwareServicePrompt(
              useCaseContext.analysis.useCase,
              useCaseContext.analysis.operations,
              buildAnswersSummary(useCaseContext.analysis.questions, useCaseContext.answers),
              ormGuide,
            ),
          )
        : appendBananaJsAiRules(
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
          )

      const refined = await provider.generate(
        `Implement the stub methods in this file:\n\n${f.content}`,
        { system: systemPrompt, temperature: 0.2 },
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
 * Run use-case analysis on a natural-language description.
 * Returns the structured plan; used by `--plan-only` and the `bananajs_plan_module` MCP tool.
 */
async function analyzeModuleUseCase(
  provider: ReturnType<typeof resolveLlmProvider>,
  description: string,
  debug: boolean,
): Promise<UseCaseAnalysis> {
  let rawOut = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      rawOut = await provider.generate(description, {
        system: USE_CASE_ANALYSIS_SYSTEM,
        temperature: 0,
      })
      if (debug) {
        console.log(chalk.gray('--- LLM raw use-case analysis output ---'))
        console.log(chalk.gray(rawOut))
        console.log(chalk.gray('--- end ---'))
      }
      return tryParseUseCaseAnalysis(rawOut)
    } catch (e) {
      if (debug && attempt === 0) {
        console.log(chalk.yellow(`Use-case analysis parse failed (attempt ${attempt + 1}), retrying…`))
      }
      if (attempt === 1) throw e
    }
  }
  // unreachable but satisfies TS control flow
  throw new Error('Use-case analysis failed.')
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

// ─── Pipeline types ───────────────────────────────────────────────────────────

/**
 * Discriminated result returned by the module pipeline's validate() stage.
 * aiGenerateModule() inspects status and handles process lifecycle.
 */
export type AiModuleResult =
  | { status: 'plan'; analysis: UseCaseAnalysis }
  | { status: 'hitl_required'; analysis: UseCaseAnalysis }
  | { status: 'generated'; extraction: EntityExtraction; fileCount: number }

interface ModuleCtx extends BaseCtx {
  cwd: string
  opts: AiModuleGenerateOptions
  orm: OrmChoice
  outBase: string
  existingEntities: ExistingEntityContext[]
  parsedSchema: ParsedSchema | undefined
  useCaseContext: UseCaseContext | undefined
  analysis: UseCaseAnalysis | undefined
  extraction: EntityExtraction | undefined
  files: Array<{ relativePath: string; content: string }>
  needsExternalHitl: boolean
}

// ─── Operation ────────────────────────────────────────────────────────────────

const moduleOperation: LlmOperation<AiModuleGenerateOptions, ModuleCtx, AiModuleResult> = {
  name: 'ai-module',

  // Prepare: config, ORM, outBase, existingEntities, pre-built context
  async prepare(opts) {
    const cwd = opts.cwd ?? process.cwd()
    const config = await loadBananarc(cwd)
    const defaultOrm = resolveOrm(config.generate?.defaultOrm, 'typeorm')
    let fallback = defaultOrm
    if (opts.preset) {
      const mapped = presetIdToOrm(opts.preset)
      if (!mapped) {
        throw new Error(`Invalid --preset "${opts.preset}". Use: ${PRESET_ORM_HELP}`)
      }
      fallback = mapped
    }
    const orm = resolveOrm(opts.orm, fallback)
    const outBase = path.resolve(cwd, opts.out ?? config.generate?.outDir ?? 'src')
    const existingEntities = await scanExistingModules(outBase)

    let useCaseContext: UseCaseContext | undefined
    if (opts.context) {
      try {
        const raw = JSON.parse(opts.context)
        useCaseContext = UseCaseContextSchema.parse(raw)
      } catch (e) {
        throw new Error(
          `Invalid --context JSON: ${e instanceof Error ? e.message : String(e)}`,
        )
      }
    }

    const provider = resolveLlmProvider(config)

    return {
      cwd,
      opts,
      orm,
      outBase,
      existingEntities,
      parsedSchema: undefined,
      useCaseContext,
      analysis: undefined,
      extraction: undefined,
      files: [],
      needsExternalHitl: false,
      provider,
      providerAvailable: true,
      debug: opts.debug ?? false,
    }
  },

  // Research: schema-driven path reads and parses the schema file; text-driven validates description
  async research(ctx) {
    if (ctx.opts.fromSchema) {
      let content: string
      try {
        content = await fs.readFile(ctx.opts.fromSchema, 'utf-8')
      } catch {
        throw new Error(`File not found: ${ctx.opts.fromSchema}`)
      }
      try {
        ctx.parsedSchema = parseSchema(content, ctx.opts.fromSchema)
      } catch {
        throw new Error(`Failed to parse schema: ${ctx.opts.fromSchema}`)
      }
    } else if (ctx.opts.planOnly) {
      if (typeof ctx.opts.module !== 'string' || !ctx.opts.module.trim()) {
        throw new Error('--plan-only requires --module "<description>"')
      }
    } else if (!(typeof ctx.opts.module === 'string' && ctx.opts.module.trim().length > 0)) {
      throw new Error(
        'DDD module generation requires --from-schema <file> or --module "<description>", or run in a TTY for prompts.',
      )
    }
    return ctx
  },

  // Plan: no-op for module generation (all logic is in act)
  async plan(ctx) {
    return ctx
  },

  // Act: 3 chained LLM calls (use-case analysis → HITL → entity extraction → optional detailed pass)
  async act(ctx) {
    // ── plan-only: single LLM call — analyse use case and return early ───────
    if (ctx.opts.planOnly) {
      ctx.analysis = await analyzeModuleUseCase(
        ctx.provider,
        (ctx.opts.module as string).trim(),
        ctx.debug,
      )
      return ctx
    }

    // ── schema-driven: no LLM extraction needed ───────────────────────────────
    if (ctx.parsedSchema) {
      ctx.extraction = schemaToExtraction(ctx.parsedSchema)
    } else {
      // ── text-driven: use-case analysis + optional HITL + entity extraction ──
      const description = (ctx.opts.module as string).trim()

      if (!ctx.useCaseContext) {
        console.log(chalk.cyan('Analysing use-case…'))
        const analysis = await analyzeModuleUseCase(ctx.provider, description, ctx.debug)

        if (analysis.hitlRequired) {
          if (process.stdin.isTTY) {
            console.log(chalk.bold('\nUse-case identified:'), chalk.cyan(analysis.summary))
            console.log(
              chalk.bold('\nBefore generating code, please answer these questions:'),
              chalk.gray('(press Enter to accept the default)\n'),
            )
            const answers: Record<string, string> = {}
            for (const q of analysis.questions) {
              const { answer } = await inquirer.prompt<{ answer: string }>([
                {
                  type: 'input',
                  name: 'answer',
                  message: q.question,
                  default: q.default ?? '',
                },
              ])
              answers[q.id] = answer.trim() || (q.default ?? '')
            }
            ctx.useCaseContext = { analysis, answers }
          } else {
            // Non-TTY (MCP/CI): signal to validate() to return hitl_required
            ctx.needsExternalHitl = true
            ctx.analysis = analysis
            return ctx
          }
        } else {
          ctx.useCaseContext = { analysis, answers: {} }
        }
      }

      ctx.extraction = await extractEntityWithLlm(
        ctx.provider,
        description,
        ctx.debug,
        ctx.opts.explicitName,
        ctx.existingEntities.length > 0 ? ctx.existingEntities : undefined,
        ctx.useCaseContext,
      )
    }

    // ── Build module file tree ─────────────────────────────────────────────
    ctx.files = buildDddModuleFromExtraction(ctx.extraction!, ctx.orm)

    // ── Optional detailed pass: flesh out application service bodies ──────
    if (ctx.opts.detailed) {
      ctx.files = await applyDetailedPass(
        ctx.provider,
        ctx.files,
        ctx.debug,
        ctx.orm,
        ctx.useCaseContext,
      )
    }

    return ctx
  },

  // Validate: return discriminated result; write files and register bootstrap
  async validate(ctx): Promise<AiModuleResult> {
    // Plan-only: caller prints JSON and returns
    if (ctx.opts.planOnly) {
      return { status: 'plan', analysis: ctx.analysis! }
    }

    // HITL required in non-TTY context: caller writes JSON + process.exit(2)
    if (ctx.needsExternalHitl) {
      return { status: 'hitl_required', analysis: ctx.analysis! }
    }

    // Normal generation path
    const extraction = ctx.extraction!
    await writeFiles(ctx.outBase, ctx.files, ctx.opts.dryRun ?? false)

    if (!ctx.opts.dryRun) {
      const kebab = toKebabCase(extraction.entityName)
      const Pascal = toPascalCase(extraction.entityName)
      const discovered = await findBootstrapRelativePath(ctx.cwd)
      const config = await loadBananarc(ctx.cwd)
      const bootstrapRel = discovered ?? config.project?.bootstrap ?? 'src/bootstrap.ts'
      await registerModuleInBootstrap({
        cwd: ctx.cwd,
        bootstrapRelative: bootstrapRel,
        moduleFolderKebab: kebab,
        moduleExportName: moduleExportName(kebab),
        moduleIndexAbs: path.join(ctx.outBase, 'modules', kebab, 'index.ts'),
        dryRun: false,
      })

      if (ctx.orm === 'typeorm') {
        const entityAbs = path.join(
          ctx.outBase,
          moduleOutputBase(kebab),
          'infrastructure',
          `${Pascal}.orm-entity.ts`,
        )
        await patchTypeormEntitiesArray({
          cwd: ctx.cwd,
          entityFileAbs: path.resolve(entityAbs),
          entityClassName: `${Pascal}OrmEntity`,
          dryRun: false,
        })
      }
    }

    return { status: 'generated', extraction, fileCount: ctx.files.length }
  },
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function aiGenerateModule(opts: AiModuleGenerateOptions): Promise<void> {
  // TTY input collection runs before the pipeline (not a pipeline concern)
  opts = await promptAiModuleInputs(opts)

  let result: AiModuleResult
  try {
    result = await runLlmOperation(moduleOperation, opts, opts.debug)
  } catch (e) {
    if (e instanceof LlmOperationError) {
      console.error(chalk.red(`ai generate failed [${e.stage}]: ${e.cause.message}`))
    } else {
      console.error(chalk.red('ai generate failed:'), e instanceof Error ? e.message : String(e))
    }
    process.exit(1)
  }

  if (result.status === 'plan') {
    // --plan-only: caller receives JSON on stdout
    process.stdout.write(JSON.stringify(result.analysis, null, 2) + '\n')
    return
  }

  if (result.status === 'hitl_required') {
    // Non-TTY HITL: emit JSON for external tool + exit 2
    process.stdout.write(
      JSON.stringify({ hitlRequired: true, analysis: result.analysis }, null, 2) + '\n',
    )
    process.exit(2)
  }

  // status === 'generated' — files already written by validate()
}
