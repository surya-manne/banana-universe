import * as path from 'path'
import { toCamelCase, toKebabCase, toPascalCase } from './utils/naming.js'

export { toKebabCase, toPascalCase } from './utils/naming.js'

export type OrmChoice = 'typeorm' | 'mongoose' | 'none'

export interface ModuleFile {
  relativePath: string
  content: string
}

/** Relative base: src/modules/<kebab>/ */
export function moduleOutputBase(kebab: string): string {
  return path.join('modules', kebab)
}

export function moduleExportName(kebab: string): string {
  return `${toCamelCase(kebab)}Module`
}

/**
 * DDD feature module aligned with `bananajs new` scaffolds: `src/modules/<feature>/`,
 * `createModule` in `index.ts`, repository token, tsyringe `@injectable` / `@inject`.
 */
export function buildDddModuleFiles(entityNameRaw: string, orm: OrmChoice): ModuleFile[] {
  const Pascal = toPascalCase(entityNameRaw)
  const kebab = toKebabCase(entityNameRaw)
  const c = toCamelCase(Pascal)
  const base = moduleOutputBase(kebab)
  const modExport = moduleExportName(kebab)

  const domainEntity = `import { Entity } from '@banana-universe/ddd'

export interface ${Pascal}Props {
  id: string
  name: string
  createdAt?: Date
  updatedAt?: Date
}

export class ${Pascal} extends Entity<${Pascal}Props> {
  constructor(props: ${Pascal}Props) {
    super(props)
  }

  get name(): string {
    return this.props.name
  }
}
`

  const domainRepo = `import type { Repository } from '@banana-universe/ddd'
import type { InjectionToken } from 'tsyringe'
import type { ${Pascal} } from './${Pascal}.entity'

export type ${Pascal}Repository = Repository<${Pascal}>

export const ${Pascal}RepositoryToken = Symbol('${Pascal}Repository') as InjectionToken<${Pascal}Repository>
`

  const dto = `import { z } from 'zod'

export const Create${Pascal}Schema = z.object({
  name: z.string().min(1),
})

export const Update${Pascal}Schema = z.object({
  name: z.string().min(1).optional(),
})

export type Create${Pascal}Dto = z.infer<typeof Create${Pascal}Schema>
export type Update${Pascal}Dto = z.infer<typeof Update${Pascal}Schema>
`

  const appService = `import { randomUUID } from 'node:crypto'
import { inject, injectable } from 'tsyringe'
import type { ${Pascal}Repository } from '../domain/${Pascal}.repository'
import { ${Pascal}RepositoryToken } from '../domain/${Pascal}.repository'
import { ${Pascal}, type ${Pascal}Props } from '../domain/${Pascal}.entity'
import type { Create${Pascal}Dto, Update${Pascal}Dto } from '../${Pascal}.dto'

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
    const props: ${Pascal}Props = {
      id: randomUUID(),
      name: dto.name,
    }
    const entity = new ${Pascal}(props)
    return this.${c}Repository.save(entity)
  }

  async update(id: string, dto: Update${Pascal}Dto): Promise<${Pascal} | null> {
    const existing = await this.${c}Repository.findById(id)
    if (!existing) return null
    const props: ${Pascal}Props = {
      id: existing.id as string,
      name: dto.name ?? existing.name,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    }
    return this.${c}Repository.save(new ${Pascal}(props))
  }

  async remove(id: string): Promise<void> {
    await this.${c}Repository.delete(id)
  }
}
`

  const controller = `import 'reflect-metadata'
import type { Request, Response } from 'express'
import { inject, injectable } from 'tsyringe'
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
import { ${Pascal}AppService } from './application/${Pascal}.service'
import { Create${Pascal}Schema, Update${Pascal}Schema } from './${Pascal}.dto'

const ${kebab}IdParams = z.object({ id: z.string().min(1) })

@injectable()
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
    const dto = req.body as { name: string }
    const data = await this.app.create(dto)
    this.ok(res, 'created', data)
  }

  @Put(':id')
  @Params(${kebab}IdParams)
  @Body(Update${Pascal}Schema)
  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    const dto = req.body as { name?: string }
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

  const infra = infraFiles(Pascal, kebab, orm)
  const repoClass = infra.repoClassName

  const indexTs = `import { createModule } from '@banana-universe/bananajs'
import { ${Pascal}Controller } from './${Pascal}.controller'
import { ${Pascal}AppService } from './application/${Pascal}.service'
import { ${Pascal}RepositoryToken } from './domain/${Pascal}.repository'
import { ${repoClass} } from './infrastructure/${infra.repoFileBase}'

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

function infraFiles(
  Pascal: string,
  kebab: string,
  orm: OrmChoice,
): { repoClassName: string; repoFileBase: string; extraFiles: ModuleFile[] } {
  if (orm === 'typeorm') {
    const ormEntity = typeormEntity(Pascal, kebab)
    const repo = typeormRepo(Pascal, kebab)
    return {
      repoClassName: `${Pascal}TypeOrmRepository`,
      repoFileBase: `${Pascal}.typeorm-repository`,
      extraFiles: [
        {
          relativePath: path.join(
            moduleOutputBase(kebab),
            'infrastructure',
            `${Pascal}.orm-entity.ts`,
          ),
          content: ormEntity,
        },
        {
          relativePath: path.join(
            moduleOutputBase(kebab),
            'infrastructure',
            `${Pascal}.typeorm-repository.ts`,
          ),
          content: repo,
        },
      ],
    }
  }
  if (orm === 'mongoose') {
    const model = mongooseModel(Pascal, kebab)
    const repo = mongooseRepo(Pascal, kebab)
    return {
      repoClassName: `${Pascal}MongooseRepository`,
      repoFileBase: `${Pascal}.mongoose-repository`,
      extraFiles: [
        {
          relativePath: path.join(
            moduleOutputBase(kebab),
            'infrastructure',
            `${Pascal}.mongoose-model.ts`,
          ),
          content: model,
        },
        {
          relativePath: path.join(
            moduleOutputBase(kebab),
            'infrastructure',
            `${Pascal}.mongoose-repository.ts`,
          ),
          content: repo,
        },
      ],
    }
  }
  const repo = inMemoryRepo(Pascal, kebab)
  return {
    repoClassName: `${Pascal}InMemoryRepository`,
    repoFileBase: `${Pascal}.in-memory-repository`,
    extraFiles: [
      {
        relativePath: path.join(
          moduleOutputBase(kebab),
          'infrastructure',
          `${Pascal}.in-memory-repository.ts`,
        ),
        content: repo,
      },
    ],
  }
}

function typeormEntity(Pascal: string, kebab: string): string {
  return `import { Column, CreateDateColumn, Entity as OrmEntity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

@OrmEntity('${kebab}')
export class ${Pascal}OrmEntity {
  @PrimaryColumn('uuid')
  id!: string

  @Column()
  name!: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
`
}

function typeormRepo(Pascal: string, kebab: string): string {
  return `import type { DataSource } from 'typeorm'
import { inject, injectable } from 'tsyringe'
import { TypeOrmRepositoryAdapter } from '@banana-universe/plugin-typeorm'
import { ${Pascal} } from '../domain/${Pascal}.entity'
import { ${Pascal}OrmEntity } from './${Pascal}.orm-entity'

@injectable()
export class ${Pascal}TypeOrmRepository extends TypeOrmRepositoryAdapter<${Pascal}, ${Pascal}OrmEntity> {
  constructor(@inject('dataSource') dataSource: DataSource) {
    super(dataSource, ${Pascal}OrmEntity)
  }

  toDomain(orm: ${Pascal}OrmEntity): ${Pascal} {
    return new ${Pascal}({
      id: orm.id,
      name: orm.name,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    })
  }

  toPersistence(domain: ${Pascal}): ${Pascal}OrmEntity {
    const row = new ${Pascal}OrmEntity()
    row.id = domain.id as string
    row.name = domain.name
    row.createdAt = domain.createdAt
    row.updatedAt = domain.updatedAt
    return row
  }
}
`
}

function mongooseModel(Pascal: string, kebab: string): string {
  return `import type { Connection } from 'mongoose'
import { Schema, type HydratedDocument, type Model } from 'mongoose'

export type ${Pascal}Doc = HydratedDocument<{
  _id: string
  name: string
  createdAt: Date
  updatedAt: Date
}>

export const ${toCamelCase(Pascal)}Schema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
  },
  { collection: '${kebab}', timestamps: true },
)

export function get${Pascal}Model(connection: Connection): Model<${Pascal}Doc> {
  const existing = connection.models['${Pascal}'] as Model<${Pascal}Doc> | undefined
  return existing ?? connection.model<${Pascal}Doc>('${Pascal}', ${toCamelCase(Pascal)}Schema)
}
`
}

function mongooseRepo(Pascal: string, kebab: string): string {
  return `import type { Connection } from 'mongoose'
import { inject, injectable } from 'tsyringe'
import { MongooseRepositoryAdapter } from '@banana-universe/plugin-mongoose'
import { ${Pascal} } from '../domain/${Pascal}.entity'
import { get${Pascal}Model, type ${Pascal}Doc } from './${Pascal}.mongoose-model'

@injectable()
export class ${Pascal}MongooseRepository extends MongooseRepositoryAdapter<${Pascal}, ${Pascal}Doc> {
  constructor(@inject('mongooseConnection') connection: Connection) {
    super(get${Pascal}Model(connection))
  }

  toDomain(doc: ${Pascal}Doc): ${Pascal} {
    return new ${Pascal}({
      id: String(doc._id),
      name: doc.name,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    })
  }

  toPersistence(domain: ${Pascal}): Partial<${Pascal}Doc> {
    return {
      _id: domain.id,
      name: domain.name,
    }
  }
}
`
}

function inMemoryRepo(Pascal: string, _kebab: string): string {
  return `import type { FindCriteria } from '@banana-universe/ddd'
import type { ${Pascal}Repository } from '../domain/${Pascal}.repository'
import { ${Pascal} } from '../domain/${Pascal}.entity'
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

// ─── Flat (no-subdirectory) module ────────────────────────────────────────────

/**
 * Flat feature module — all files at `src/modules/<feature>/`, no `domain/` /
 * `application/` / `infrastructure/` subdirectories.  Uses a plain interface
 * type instead of the DDD `Entity<Props>` base class.
 */
export function buildFlatModuleFiles(entityNameRaw: string, orm: OrmChoice): ModuleFile[] {
  const Pascal = toPascalCase(entityNameRaw)
  const kebab = toKebabCase(entityNameRaw)
  const base = moduleOutputBase(kebab)
  const modExport = moduleExportName(kebab)
  const repoClass = flatRepoClassName(Pascal, orm)

  const dto = `import { z } from 'zod'

export const Create${Pascal}Schema = z.object({
  name: z.string().min(1),
})

export const Update${Pascal}Schema = z.object({
  name: z.string().min(1).optional(),
})

export type Create${Pascal}Dto = z.infer<typeof Create${Pascal}Schema>
export type Update${Pascal}Dto = z.infer<typeof Update${Pascal}Schema>
`

  const service = `import { randomUUID } from 'node:crypto'
import { inject, injectable } from 'tsyringe'
import type { ${Pascal}FlatRepository, ${Pascal}Record } from './${Pascal}.repository'
import { ${Pascal}RepositoryToken } from './${Pascal}.repository'
import type { Create${Pascal}Dto, Update${Pascal}Dto } from './${Pascal}.dto'

@injectable()
export class ${Pascal}Service {
  constructor(
    @inject(${Pascal}RepositoryToken)
    private readonly repo: ${Pascal}FlatRepository,
  ) {}

  async findAll(): Promise<${Pascal}Record[]> {
    return this.repo.findAll()
  }

  async findOne(id: string): Promise<${Pascal}Record | null> {
    return this.repo.findById(id)
  }

  async create(dto: Create${Pascal}Dto): Promise<${Pascal}Record> {
    return this.repo.save({ id: randomUUID(), name: dto.name })
  }

  async update(id: string, dto: Update${Pascal}Dto): Promise<${Pascal}Record | null> {
    const existing = await this.repo.findById(id)
    if (!existing) return null
    return this.repo.save({ ...existing, name: dto.name ?? existing.name })
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id)
  }
}
`

  const controller = `import 'reflect-metadata'
import type { Request, Response } from 'express'
import { inject, injectable } from 'tsyringe'
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
import { ${Pascal}Service } from './${Pascal}.service'
import { Create${Pascal}Schema, Update${Pascal}Schema } from './${Pascal}.dto'

const ${kebab}IdParams = z.object({ id: z.string().min(1) })

@injectable()
@Controller('${kebab}')
export class ${Pascal}Controller extends BaseController {
  constructor(@inject(${Pascal}Service) private readonly svc: ${Pascal}Service) {
    super()
  }

  @Get('')
  async list(_req: Request, res: Response): Promise<void> {
    const data = await this.svc.findAll()
    this.ok(res, 'ok', data)
  }

  @Get(':id')
  @Params(${kebab}IdParams)
  async one(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    const data = await this.svc.findOne(id)
    this.ok(res, 'ok', data)
  }

  @Post('')
  @Body(Create${Pascal}Schema)
  async create(req: Request, res: Response): Promise<void> {
    const dto = req.body as { name: string }
    const data = await this.svc.create(dto)
    this.ok(res, 'created', data)
  }

  @Put(':id')
  @Params(${kebab}IdParams)
  @Body(Update${Pascal}Schema)
  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    const dto = req.body as { name?: string }
    const data = await this.svc.update(id, dto)
    this.ok(res, 'ok', data)
  }

  @Delete(':id')
  @Params(${kebab}IdParams)
  async remove(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string }
    await this.svc.remove(id)
    this.ok(res, 'ok', { ok: true })
  }
}
`

  const indexTs = `import { createModule } from '@banana-universe/bananajs'
import { ${Pascal}Controller } from './${Pascal}.controller'
import { ${Pascal}Service } from './${Pascal}.service'
import { ${Pascal}RepositoryToken, ${repoClass} } from './${Pascal}.repository'

export const ${modExport} = createModule({
  id: '${kebab}',
  controller: ${Pascal}Controller,
  providers: [
    { token: ${Pascal}RepositoryToken, useClass: ${repoClass} },
    ${Pascal}Service,
  ],
})
`

  return [
    { relativePath: path.join(base, `${Pascal}.dto.ts`), content: dto },
    { relativePath: path.join(base, `${Pascal}.service.ts`), content: service },
    { relativePath: path.join(base, `${Pascal}.controller.ts`), content: controller },
    { relativePath: path.join(base, `${Pascal}.repository.ts`), content: flatRepoFile(Pascal, kebab, orm) },
    { relativePath: path.join(base, 'index.ts'), content: indexTs },
  ]
}

function flatRepoClassName(Pascal: string, orm: OrmChoice): string {
  if (orm === 'typeorm') return `${Pascal}TypeOrmRepository`
  if (orm === 'mongoose') return `${Pascal}MongooseRepository`
  return `${Pascal}InMemoryRepository`
}

function flatRepoFile(Pascal: string, kebab: string, orm: OrmChoice): string {
  const c = toCamelCase(Pascal)

  if (orm === 'typeorm') {
    return `import type { InjectionToken } from 'tsyringe'
import { Column, CreateDateColumn, Entity as OrmEntity, PrimaryColumn, UpdateDateColumn } from 'typeorm'
import type { DataSource } from 'typeorm'
import { inject, injectable } from 'tsyringe'

export interface ${Pascal}Record {
  id: string
  name: string
  createdAt?: Date
  updatedAt?: Date
}

export const ${Pascal}RepositoryToken = Symbol('${Pascal}Repository') as InjectionToken<${Pascal}FlatRepository>

export interface ${Pascal}FlatRepository {
  findAll(): Promise<${Pascal}Record[]>
  findById(id: string): Promise<${Pascal}Record | null>
  save(record: ${Pascal}Record): Promise<${Pascal}Record>
  delete(id: string): Promise<void>
}

@OrmEntity('${kebab}')
export class ${Pascal}OrmEntity {
  @PrimaryColumn('uuid')
  id!: string

  @Column()
  name!: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}

@injectable()
export class ${Pascal}TypeOrmRepository implements ${Pascal}FlatRepository {
  constructor(@inject('dataSource') private readonly ds: DataSource) {}

  private get repo() {
    return this.ds.getRepository(${Pascal}OrmEntity)
  }

  async findAll(): Promise<${Pascal}Record[]> {
    return this.repo.find()
  }

  async findById(id: string): Promise<${Pascal}Record | null> {
    return this.repo.findOne({ where: { id } })
  }

  async save(record: ${Pascal}Record): Promise<${Pascal}Record> {
    return this.repo.save(record)
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id })
  }
}
`
  }

  if (orm === 'mongoose') {
    return `import type { InjectionToken } from 'tsyringe'
import { inject, injectable } from 'tsyringe'
import type { Connection, Model } from 'mongoose'
import { Schema, type HydratedDocument } from 'mongoose'
import { randomUUID } from 'node:crypto'

export interface ${Pascal}Record {
  id: string
  name: string
  createdAt?: Date
  updatedAt?: Date
}

export const ${Pascal}RepositoryToken = Symbol('${Pascal}Repository') as InjectionToken<${Pascal}FlatRepository>

export interface ${Pascal}FlatRepository {
  findAll(): Promise<${Pascal}Record[]>
  findById(id: string): Promise<${Pascal}Record | null>
  save(record: ${Pascal}Record): Promise<${Pascal}Record>
  delete(id: string): Promise<void>
}

type ${Pascal}Doc = HydratedDocument<{ _id: string; name: string; createdAt: Date; updatedAt: Date }>

const ${c}Schema = new Schema(
  { _id: { type: String, required: true }, name: { type: String, required: true } },
  { collection: '${kebab}s', timestamps: true },
)

function get${Pascal}Model(connection: Connection): Model<${Pascal}Doc> {
  return (connection.models['${Pascal}'] as Model<${Pascal}Doc> | undefined) ??
    connection.model<${Pascal}Doc>('${Pascal}', ${c}Schema)
}

@injectable()
export class ${Pascal}MongooseRepository implements ${Pascal}FlatRepository {
  private readonly model: Model<${Pascal}Doc>
  constructor(@inject('mongooseConnection') connection: Connection) {
    this.model = get${Pascal}Model(connection)
  }

  async findAll(): Promise<${Pascal}Record[]> {
    const docs = await this.model.find().lean()
    return docs.map((d) => ({
      id: String(d._id),
      name: d.name,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }))
  }

  async findById(id: string): Promise<${Pascal}Record | null> {
    const d = await this.model.findById(id).lean()
    if (!d) return null
    return { id: String(d._id), name: d.name, createdAt: d.createdAt, updatedAt: d.updatedAt }
  }

  async save(record: ${Pascal}Record): Promise<${Pascal}Record> {
    const id = record.id ?? randomUUID()
    await this.model.findByIdAndUpdate(
      id,
      { _id: id, name: record.name },
      { upsert: true, new: true },
    )
    return { ...record, id }
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id })
  }
}
`
  }

  // none — in-memory
  return `import type { InjectionToken } from 'tsyringe'
import { injectable } from 'tsyringe'

export interface ${Pascal}Record {
  id: string
  name: string
  createdAt?: Date
  updatedAt?: Date
}

export const ${Pascal}RepositoryToken = Symbol('${Pascal}Repository') as InjectionToken<${Pascal}FlatRepository>

export interface ${Pascal}FlatRepository {
  findAll(): Promise<${Pascal}Record[]>
  findById(id: string): Promise<${Pascal}Record | null>
  save(record: ${Pascal}Record): Promise<${Pascal}Record>
  delete(id: string): Promise<void>
}

@injectable()
export class ${Pascal}InMemoryRepository implements ${Pascal}FlatRepository {
  private readonly store = new Map<string, ${Pascal}Record>()

  async findAll(): Promise<${Pascal}Record[]> {
    return [...this.store.values()]
  }

  async findById(id: string): Promise<${Pascal}Record | null> {
    return this.store.get(id) ?? null
  }

  async save(record: ${Pascal}Record): Promise<${Pascal}Record> {
    this.store.set(record.id, record)
    return record
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id)
  }
}
`
}
