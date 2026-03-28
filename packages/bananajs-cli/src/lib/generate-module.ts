import * as path from 'path'
import { toKebabCase, toPascalCase } from './utils/naming.js'

export { toKebabCase, toPascalCase } from './utils/naming.js'

export type OrmChoice = 'typeorm' | 'mongoose' | 'none'

export interface ModuleFile {
  relativePath: string
  content: string
}

export function buildDddModuleFiles(entityNameRaw: string, orm: OrmChoice): ModuleFile[] {
  const Pascal = toPascalCase(entityNameRaw)
  const kebab = toKebabCase(entityNameRaw)
  const base = path.join(kebab)

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

  const domainMapper = `import type { Repository } from '@banana-universe/ddd'
import type { ${Pascal} } from './${Pascal}.entity.js'

export type ${Pascal}Mapper = Repository<${Pascal}>
`

  const domainService = `import { DomainService } from '@banana-universe/ddd'

@DomainService()
export class ${Pascal}DomainService {
  // Domain rules — no HTTP or ORM imports
}
`

  const appDto = `import { z } from 'zod'

export const Create${Pascal}Schema = z.object({
  name: z.string().min(1),
})

export const Update${Pascal}Schema = z.object({
  name: z.string().min(1).optional(),
})

export type Create${Pascal}Dto = z.infer<typeof Create${Pascal}Schema>
export type Update${Pascal}Dto = z.infer<typeof Update${Pascal}Schema>
`

  const files: ModuleFile[] = [
    { relativePath: path.join(base, 'domain', `${Pascal}.entity.ts`), content: domainEntity },
    { relativePath: path.join(base, 'domain', `${Pascal}.mapper.ts`), content: domainMapper },
    {
      relativePath: path.join(base, 'domain', `${Pascal}.domain-service.ts`),
      content: domainService,
    },
    { relativePath: path.join(base, 'application', `${Pascal}.dto.ts`), content: appDto },
    {
      relativePath: path.join(base, 'application', `${Pascal}.service.ts`),
      content: simplifyAppService(Pascal, kebab),
    },
    {
      relativePath: path.join(base, `${Pascal}.controller.ts`),
      content: simplifyController(Pascal, kebab),
    },
  ]

  if (orm === 'typeorm') {
    files.push({
      relativePath: path.join(base, 'infrastructure', 'typeorm', `${Pascal}.orm-entity.ts`),
      content: typeormEntity(Pascal, kebab),
    })
    files.push({
      relativePath: path.join(base, 'infrastructure', 'typeorm', `${Pascal}.typeorm-repository.ts`),
      content: typeormRepo(Pascal, kebab),
    })
  } else if (orm === 'mongoose') {
    files.push({
      relativePath: path.join(
        base,
        'infrastructure',
        'mongoose',
        `${Pascal}.mongoose-repository.ts`,
      ),
      content: mongooseRepo(Pascal, kebab),
    })
  } else {
    files.push({
      relativePath: path.join(base, 'infrastructure', `${Pascal}.in-memory-repository.ts`),
      content: inMemoryRepo(Pascal, kebab),
    })
  }

  return files
}

function camel(pascal: string): string {
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

function simplifyAppService(Pascal: string, kebab: string): string {
  const c = camel(Pascal)
  return `import { ApplicationService } from '@banana-universe/ddd'
import type { ${Pascal}Mapper } from '../domain/${Pascal}.mapper.js'
import { ${Pascal}, type ${Pascal}Props } from '../domain/${Pascal}.entity.js'
import type { Create${Pascal}Dto, Update${Pascal}Dto } from './${Pascal}.dto.js'
import { randomUUID } from 'node:crypto'

@ApplicationService()
export class ${Pascal}AppService {
  constructor(private readonly ${c}Mapper: ${Pascal}Mapper) {}

  async findAll(): Promise<${Pascal}[]> {
    return this.${c}Mapper.findAll()
  }

  async findOne(id: string): Promise<${Pascal} | null> {
    return this.${c}Mapper.findById(id)
  }

  async create(dto: Create${Pascal}Dto): Promise<${Pascal}> {
    const props: ${Pascal}Props = {
      id: randomUUID(),
      name: dto.name,
    }
    const entity = new ${Pascal}(props)
    return this.${c}Mapper.save(entity)
  }

  async update(id: string, dto: Update${Pascal}Dto): Promise<${Pascal} | null> {
    const existing = await this.${c}Mapper.findById(id)
    if (!existing) return null
    const props: ${Pascal}Props = {
      id: existing.id as string,
      name: dto.name ?? existing.name,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    }
    return this.${c}Mapper.save(new ${Pascal}(props))
  }

  async remove(id: string): Promise<void> {
    await this.${c}Mapper.delete(id)
  }
}
`
}

function simplifyController(Pascal: string, kebab: string): string {
  return `import {
  BaseController,
  Body,
  Controller,
  Delete,
  Get,
  Params,
  Post,
  Put,
} from '@banana-universe/bananajs'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { ${Pascal}AppService } from './application/${Pascal}.service.js'
import { Create${Pascal}Schema, Update${Pascal}Schema } from './application/${Pascal}.dto.js'

const ${kebab}IdParams = z.object({ id: z.string().min(1) })

@Controller('${kebab}')
export class ${Pascal}Controller extends BaseController {
  constructor(private readonly app: ${Pascal}AppService) {
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
import { TypeOrmRepositoryAdapter } from '@banana-universe/plugin-typeorm'
import { ${Pascal} } from '../../domain/${Pascal}.entity.js'
import { ${Pascal}OrmEntity } from './${Pascal}.orm-entity.js'

export class ${Pascal}TypeOrmRepository extends TypeOrmRepositoryAdapter<${Pascal}, ${Pascal}OrmEntity> {
  constructor(dataSource: DataSource) {
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

function mongooseRepo(Pascal: string, kebab: string): string {
  const schemaVar = `${camel(Pascal)}Schema`
  return `import { Schema, type Connection, type HydratedDocument } from 'mongoose'
import { MongooseRepositoryAdapter } from '@banana-universe/plugin-mongoose'
import { ${Pascal} } from '../../domain/${Pascal}.entity.js'

type ${Pascal}Doc = HydratedDocument<{
  name: string
  createdAt?: Date
  updatedAt?: Date
}>

const ${schemaVar} = new Schema(
  {
    name: { type: String, required: true },
    createdAt: { type: Date },
    updatedAt: { type: Date },
  },
  { collection: '${kebab}s' },
)

export class ${Pascal}MongooseRepository extends MongooseRepositoryAdapter<${Pascal}, ${Pascal}Doc> {
  constructor(connection: Connection) {
    const existing = connection.models['${Pascal}'] as
      | import('mongoose').Model<${Pascal}Doc>
      | undefined
    const model = existing ?? connection.model<${Pascal}Doc>('${Pascal}', ${schemaVar})
    super(model)
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
      name: domain.name,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    }
  }
}
`
}

function inMemoryRepo(Pascal: string, kebab: string): string {
  return `import type { FindCriteria } from '@banana-universe/ddd'
import type { ${Pascal}Mapper } from '../domain/${Pascal}.mapper.js'
import { ${Pascal} } from '../domain/${Pascal}.entity.js'

export class ${Pascal}InMemoryRepository implements ${Pascal}Mapper {
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
