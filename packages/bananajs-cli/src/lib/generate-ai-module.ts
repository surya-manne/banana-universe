import * as path from 'path'
import type { ModuleFile } from './generate-module.js'
import type { OrmChoice } from './generate-module.js'
import { moduleExportName, moduleOutputBase } from './generate-module.js'
import { toCamelCase, toKebabCase, toPascalCase } from './utils/naming.js'
import { normalizeExtractionType } from './utils/type-mapping.js'
import type { EntityExtraction } from './llm/entity-extraction.js'

interface NormalizedField {
  name: string
  ts: string
  optional: boolean
}

function normalizeFields(extraction: EntityExtraction): NormalizedField[] {
  const raw = extraction.fields.map((f) => ({
    name: safeIdentifier(f.name),
    ts: normalizeExtractionType(f.type),
    optional: f.optional === true,
  }))
  if (raw.length === 0) {
    return [{ name: 'name', ts: 'string', optional: false }]
  }
  return raw
}

function safeIdentifier(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_$]/g, '_')
  const base = /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned
  return base || 'field'
}

function zodSchemaField(f: NormalizedField, forUpdate: boolean): string {
  let inner: string
  if (f.ts === 'number') inner = 'z.number()'
  else if (f.ts === 'boolean') inner = 'z.boolean()'
  else if (f.ts === 'Date') inner = 'z.coerce.date()'
  else if (f.ts.endsWith('[]')) inner = 'z.array(z.string())'
  else inner = 'z.string().min(1)'
  if (forUpdate) return `  ${f.name}: ${inner}.optional()`
  if (f.optional) return `  ${f.name}: ${inner}.optional()`
  return `  ${f.name}: ${inner}`
}

function createZodFields(fields: NormalizedField[]): string {
  return fields.map((f) => zodSchemaField(f, false)).join(',\n')
}

function updateZodFields(fields: NormalizedField[]): string {
  return fields.map((f) => zodSchemaField(f, true)).join(',\n')
}

function entityPropsInterface(Pascal: string, fields: NormalizedField[]): string {
  const lines = fields.map((f) => `  ${f.name}${f.optional ? '?' : ''}: ${f.ts}`)
  return `export interface ${Pascal}Props {
  id: string
${lines.join('\n')}
  createdAt?: Date
  updatedAt?: Date
}`
}

function entityGetters(fields: NormalizedField[]): string {
  return fields
    .map((f) => {
      return `  get ${f.name}(): ${f.ts} {
    return this.props.${f.name}${f.optional ? '!' : ''}
  }`
    })
    .join('\n\n')
}

function typeormColumn(field: NormalizedField): string {
  const ts = field.ts
  if (ts === 'number') return `@Column('double precision')\n  ${field.name}!: number`
  if (ts === 'boolean') return `@Column()\n  ${field.name}!: boolean`
  if (ts === 'Date') return `@Column({ type: 'timestamp' })\n  ${field.name}!: Date`
  if (ts.endsWith('[]')) return `@Column('simple-json')\n  ${field.name}!: string[]`
  return `@Column()\n  ${field.name}!: string`
}

function mongooseSchemaFields(fields: NormalizedField[]): string {
  return fields
    .map((f) => {
      if (f.ts === 'number') return `    ${f.name}: { type: Number }`
      if (f.ts === 'boolean') return `    ${f.name}: { type: Boolean }`
      if (f.ts === 'Date') return `    ${f.name}: { type: Date }`
      if (f.ts.endsWith('[]')) return `    ${f.name}: { type: [String] }`
      return `    ${f.name}: { type: String${f.optional ? '' : ', required: true'} }`
    })
    .join(',\n')
}

function mongooseDocInterface(fields: NormalizedField[]): string {
  return fields.map((f) => `  ${f.name}${f.optional ? '?' : ''}: ${f.ts}`).join('\n')
}

function toDomainProps(fields: NormalizedField[]): string {
  return fields.map((f) => `      ${f.name}: orm.${f.name}`).join(',\n')
}

function toDomainDocProps(fields: NormalizedField[]): string {
  return fields.map((f) => `      ${f.name}: doc.${f.name}`).join(',\n')
}

function createPropsBlock(Pascal: string, c: string, fields: NormalizedField[]): string {
  const lines = fields.map((f) => `      ${f.name}: dto.${f.name}`).join(',\n')
  return `    const props: ${Pascal}Props = {
      id: randomUUID(),
${lines},
    }
    const entity = new ${Pascal}(props)
    return this.${c}Repository.save(entity)`
}

function updatePropsBlock(Pascal: string, c: string, fields: NormalizedField[]): string {
  const merge = fields
    .map((f) => `      ${f.name}: dto.${f.name} !== undefined ? dto.${f.name} : existing.${f.name}`)
    .join(',\n')
  return `    const existing = await this.${c}Repository.findById(id)
    if (!existing) return null
    const props: ${Pascal}Props = {
      id: existing.id as string,
${merge},
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    }
    return this.${c}Repository.save(new ${Pascal}(props))`
}

function buildTypeormEntity(Pascal: string, kebab: string, fields: NormalizedField[]): string {
  const cols = fields.map((f) => `  ${typeormColumn(f)}`).join('\n\n')
  return `import { Column, CreateDateColumn, Entity as OrmEntity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

@OrmEntity('${kebab}')
export class ${Pascal}OrmEntity {
  @PrimaryColumn('uuid')
  id!: string

${cols}

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
`
}

function buildTypeormRepo(Pascal: string, kebab: string, fields: NormalizedField[]): string {
  const td = toDomainProps(fields)
  const rowAssign = fields.map((f) => `    row.${f.name} = domain.${f.name}`).join('\n')
  return `import type { DataSource } from 'typeorm'
import { inject, injectable } from 'tsyringe'
import { TypeOrmRepositoryAdapter } from '@banana-universe/plugin-typeorm'
import { ${Pascal} } from '../domain/${Pascal}.entity.js'
import { ${Pascal}OrmEntity } from './${Pascal}.orm-entity.js'

@injectable()
export class ${Pascal}TypeOrmRepository extends TypeOrmRepositoryAdapter<${Pascal}, ${Pascal}OrmEntity> {
  constructor(@inject('dataSource') dataSource: DataSource) {
    super(dataSource, ${Pascal}OrmEntity)
  }

  toDomain(orm: ${Pascal}OrmEntity): ${Pascal} {
    return new ${Pascal}({
      id: orm.id,
${td},
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    })
  }

  toPersistence(domain: ${Pascal}): ${Pascal}OrmEntity {
    const row = new ${Pascal}OrmEntity()
    row.id = domain.id as string
${rowAssign}
    row.createdAt = domain.createdAt
    row.updatedAt = domain.updatedAt
    return row
  }
}
`
}

function buildMongooseModel(Pascal: string, kebab: string, fields: NormalizedField[]): string {
  const docFields = mongooseDocInterface(fields)
  const schemaBody = mongooseSchemaFields(fields)
  return `import type { Connection } from 'mongoose'
import { Schema, type HydratedDocument, type Model } from 'mongoose'

export type ${Pascal}Doc = HydratedDocument<{
  _id: string
${docFields ? `${docFields}\n` : ''}  createdAt: Date
  updatedAt: Date
}>

export const ${toCamelCase(Pascal)}Schema = new Schema(
  {
    _id: { type: String, required: true }${schemaBody ? ',\n' + schemaBody : ''}
  },
  { collection: '${kebab}', timestamps: true },
)

export function get${Pascal}Model(connection: Connection): Model<${Pascal}Doc> {
  const existing = connection.models['${Pascal}'] as Model<${Pascal}Doc> | undefined
  return existing ?? connection.model<${Pascal}Doc>('${Pascal}', ${toCamelCase(Pascal)}Schema)
}
`
}

function buildMongooseRepo(Pascal: string, _kebab: string, fields: NormalizedField[]): string {
  const td = toDomainDocProps(fields)
  const persist = fields.map((f) => `      ${f.name}: domain.${f.name}`).join(',\n')
  return `import type { Connection } from 'mongoose'
import { inject, injectable } from 'tsyringe'
import { MongooseRepositoryAdapter } from '@banana-universe/plugin-mongoose'
import { ${Pascal} } from '../domain/${Pascal}.entity.js'
import { get${Pascal}Model, type ${Pascal}Doc } from './${Pascal}.mongoose-model.js'

@injectable()
export class ${Pascal}MongooseRepository extends MongooseRepositoryAdapter<${Pascal}, ${Pascal}Doc> {
  constructor(@inject('mongooseConnection') connection: Connection) {
    super(get${Pascal}Model(connection))
  }

  toDomain(doc: ${Pascal}Doc): ${Pascal} {
    return new ${Pascal}({
      id: String(doc._id),
${td},
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    })
  }

  toPersistence(domain: ${Pascal}): Partial<${Pascal}Doc> {
    return {
      _id: domain.id,
${persist},
    }
  }
}
`
}

function buildInMemoryRepo(Pascal: string, fields: NormalizedField[]): string {
  return `import type { FindCriteria } from '@banana-universe/ddd'
import type { ${Pascal}Repository } from '../domain/${Pascal}.repository.js'
import { ${Pascal} } from '../domain/${Pascal}.entity.js'
import { injectable } from 'tsyringe'

@injectable()
export class ${Pascal}InMemoryRepository implements ${Pascal}Repository {
  private readonly store = new Map<string, ${Pascal}>()

  async findById(id: string): Promise<${Pascal} | null> {
    return this.store.get(id) ?? null
  }

  async findAll(_criteria?: FindCriteria<${Pascal}>): Promise<${Pascal}[]> {
    return [...this.store.values()]
  }

  async save(entity: ${Pascal}): Promise<${Pascal}> {
    this.store.set(entity.id as string, entity)
    return entity
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id)
  }
}
`
}

function infraFiles(
  Pascal: string,
  kebab: string,
  orm: OrmChoice,
  fields: NormalizedField[],
): { repoClassName: string; repoFileBase: string; extraFiles: ModuleFile[] } {
  const base = moduleOutputBase(kebab)
  if (orm === 'typeorm') {
    return {
      repoClassName: `${Pascal}TypeOrmRepository`,
      repoFileBase: `${Pascal}.typeorm-repository`,
      extraFiles: [
        {
          relativePath: path.join(base, 'infrastructure', `${Pascal}.orm-entity.ts`),
          content: buildTypeormEntity(Pascal, kebab, fields),
        },
        {
          relativePath: path.join(base, 'infrastructure', `${Pascal}.typeorm-repository.ts`),
          content: buildTypeormRepo(Pascal, kebab, fields),
        },
      ],
    }
  }
  if (orm === 'mongoose') {
    return {
      repoClassName: `${Pascal}MongooseRepository`,
      repoFileBase: `${Pascal}.mongoose-repository`,
      extraFiles: [
        {
          relativePath: path.join(base, 'infrastructure', `${Pascal}.mongoose-model.ts`),
          content: buildMongooseModel(Pascal, kebab, fields),
        },
        {
          relativePath: path.join(base, 'infrastructure', `${Pascal}.mongoose-repository.ts`),
          content: buildMongooseRepo(Pascal, kebab, fields),
        },
      ],
    }
  }
  return {
    repoClassName: `${Pascal}InMemoryRepository`,
    repoFileBase: `${Pascal}.in-memory-repository`,
    extraFiles: [
      {
        relativePath: path.join(base, 'infrastructure', `${Pascal}.in-memory-repository.ts`),
        content: buildInMemoryRepo(Pascal, fields),
      },
    ],
  }
}

/**
 * Build DDD module files from LLM/schema extraction — same layout as `bjs generate module`
 * and `bananajs new` presets: `src/modules/<feature>/`, `createModule`, repository DI.
 */
export function buildDddModuleFromExtraction(
  extraction: EntityExtraction,
  orm: OrmChoice,
): ModuleFile[] {
  const Pascal = toPascalCase(extraction.entityName)
  const kebab = toKebabCase(extraction.entityName)
  const c = toCamelCase(Pascal)
  const fields = normalizeFields(extraction)
  const base = moduleOutputBase(kebab)
  const modExport = moduleExportName(kebab)

  const propsIface = entityPropsInterface(Pascal, fields)
  const getters = entityGetters(fields)

  const domainEntity = `import { Entity } from '@banana-universe/ddd'

${propsIface}

export class ${Pascal} extends Entity<${Pascal}Props> {
  constructor(props: ${Pascal}Props) {
    super(props)
  }

${getters}
}
`

  const domainRepo = `import type { Repository } from '@banana-universe/ddd'
import type { InjectionToken } from 'tsyringe'
import type { ${Pascal} } from './${Pascal}.entity.js'

export type ${Pascal}Repository = Repository<${Pascal}>

export const ${Pascal}RepositoryToken = Symbol('${Pascal}Repository') as InjectionToken<${Pascal}Repository>
`

  const dto = `import { z } from 'zod'

export const Create${Pascal}Schema = z.object({
${createZodFields(fields)},
})

export const Update${Pascal}Schema = z.object({
${updateZodFields(fields)},
})

export type Create${Pascal}Dto = z.infer<typeof Create${Pascal}Schema>
export type Update${Pascal}Dto = z.infer<typeof Update${Pascal}Schema>
`

  const appService = `import { randomUUID } from 'node:crypto'
import { inject, injectable } from 'tsyringe'
import type { ${Pascal}Repository } from '../domain/${Pascal}.repository.js'
import { ${Pascal}RepositoryToken } from '../domain/${Pascal}.repository.js'
import { ${Pascal}, type ${Pascal}Props } from '../domain/${Pascal}.entity.js'
import type { Create${Pascal}Dto, Update${Pascal}Dto } from '../${Pascal}.dto.js'

@injectable()
export class ${Pascal}AppService {
  constructor(
    @inject(${Pascal}RepositoryToken)
    public readonly ${c}Repository: ${Pascal}Repository,
  ) {}

  async findAll(): Promise<${Pascal}[]> {
    return this.${c}Repository.findAll()
  }

  async findOne(id: string): Promise<${Pascal} | null> {
    return this.${c}Repository.findById(id)
  }

  async create(dto: Create${Pascal}Dto): Promise<${Pascal}> {
    ${createPropsBlock(Pascal, c, fields)}
  }

  async update(id: string, dto: Update${Pascal}Dto): Promise<${Pascal} | null> {
    ${updatePropsBlock(Pascal, c, fields)}
  }

  async remove(id: string): Promise<void> {
    await this.${c}Repository.delete(id)
  }
}
`

  const controller = `import 'reflect-metadata'
import type { Request, Response } from 'express'
import { inject } from 'tsyringe'
import {
  BaseController,
  Body,
  Controller,
  Delete,
  Get,
  Params,
  Post,
  Put,
} from '@banana-universe/bananajs'
import { z } from 'zod'
import { ${Pascal}AppService } from './application/${Pascal}.service.js'
import {
  Create${Pascal}Schema,
  Update${Pascal}Schema,
  type Create${Pascal}Dto,
  type Update${Pascal}Dto,
} from './${Pascal}.dto.js'

const ${kebab}IdParams = z.object({ id: z.string().min(1) })

@Controller('${kebab}')
export class ${Pascal}Controller extends BaseController {
  constructor(@inject(${Pascal}AppService) private readonly app: ${Pascal}AppService) {
    super()
  }

  @Get('')
  async list(_req: Request, res: Response): Promise<void> {
    const data = await this.app.findAll()
    this.ok(res, 'ok', data)
  }

  @Get(':id')
  @Params(${kebab}IdParams)
  async one(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    const data = await this.app.findOne(id)
    this.ok(res, 'ok', data)
  }

  @Post('')
  @Body(Create${Pascal}Schema)
  async create(req: Request, res: Response): Promise<void> {
    const dto = req.body as Create${Pascal}Dto
    const data = await this.app.create(dto)
    this.ok(res, 'created', data)
  }

  @Put(':id')
  @Params(${kebab}IdParams)
  @Body(Update${Pascal}Schema)
  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    const dto = req.body as Update${Pascal}Dto
    const data = await this.app.update(id, dto)
    this.ok(res, 'ok', data)
  }

  @Delete(':id')
  @Params(${kebab}IdParams)
  async remove(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    await this.app.remove(id)
    this.ok(res, 'ok', { ok: true })
  }
}
`

  const infra = infraFiles(Pascal, kebab, orm, fields)
  const repoClass = infra.repoClassName

  const indexTs = `import { createModule } from '@banana-universe/bananajs'
import { ${Pascal}Controller } from './${Pascal}.controller.js'
import { ${Pascal}AppService } from './application/${Pascal}.service.js'
import { ${Pascal}RepositoryToken } from './domain/${Pascal}.repository.js'
import { ${repoClass} } from './infrastructure/${infra.repoFileBase}.js'

export const ${modExport} = createModule({
  id: '${kebab}',
  controller: ${Pascal}Controller,
  providers: [
    { token: ${Pascal}RepositoryToken, useClass: ${repoClass} },
    ${Pascal}AppService,
  ],
})
`

  const files: ModuleFile[] = [
    { relativePath: path.join(base, 'domain', `${Pascal}.entity.ts`), content: domainEntity },
    { relativePath: path.join(base, 'domain', `${Pascal}.repository.ts`), content: domainRepo },
    { relativePath: path.join(base, 'application', `${Pascal}.service.ts`), content: appService },
    { relativePath: path.join(base, `${Pascal}.dto.ts`), content: dto },
    { relativePath: path.join(base, `${Pascal}.controller.ts`), content: controller },
    ...infra.extraFiles,
    { relativePath: path.join(base, 'index.ts'), content: indexTs },
  ]

  return files
}
