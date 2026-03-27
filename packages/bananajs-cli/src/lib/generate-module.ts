import * as path from 'path'

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function toPascalCase(raw: string): string {
  return raw
    .split(/[-_\s/]+/)
    .filter(Boolean)
    .map((s) => capitalize(s.toLowerCase()))
    .join('')
}

export function toKebabCase(raw: string): string {
  const pascal = toPascalCase(raw)
  return pascal
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

export type OrmChoice = 'typeorm' | 'prisma' | 'none'

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

  const domainRepo = `import type { Repository } from '@banana-universe/ddd'
import type { ${Pascal} } from './${kebab}.entity.js'

export type ${Pascal}Repository = Repository<${Pascal}>
`

  const domainService = `import { DomainService } from '@banana-universe/ddd'

@DomainService()
export class ${Pascal}DomainService {
  // Domain rules — no HTTP or ORM imports
}
`

  const appDto = `import { IsNotEmpty, IsString } from 'class-validator'

export class Create${Pascal}Dto {
  @IsNotEmpty()
  @IsString()
  name!: string
}

export class Update${Pascal}Dto {
  @IsString()
  name?: string
}
`

  const files: ModuleFile[] = [
    { relativePath: path.join(base, 'domain', `${kebab}.entity.ts`), content: domainEntity },
    { relativePath: path.join(base, 'domain', `${kebab}.repository.ts`), content: domainRepo },
    { relativePath: path.join(base, 'domain', `${kebab}.service.ts`), content: domainService },
    { relativePath: path.join(base, 'application', `${kebab}.dto.ts`), content: appDto },
    {
      relativePath: path.join(base, 'application', `${kebab}.app-service.ts`),
      content: simplifyAppService(Pascal, kebab),
    },
    {
      relativePath: path.join(base, `${kebab}.controller.ts`),
      content: simplifyController(Pascal, kebab),
    },
  ]

  if (orm === 'typeorm') {
    files.push({
      relativePath: path.join(base, 'infrastructure', 'typeorm', `${kebab}.orm-entity.ts`),
      content: typeormEntity(Pascal, kebab),
    })
    files.push({
      relativePath: path.join(base, 'infrastructure', 'typeorm', `${kebab}.typeorm-repository.ts`),
      content: typeormRepo(Pascal, kebab),
    })
  } else if (orm === 'prisma') {
    files.push({
      relativePath: path.join(base, 'infrastructure', 'prisma', `${kebab}.prisma-repository.ts`),
      content: prismaRepo(Pascal, kebab),
    })
  } else {
    files.push({
      relativePath: path.join(base, 'infrastructure', `${kebab}.in-memory-repository.ts`),
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
import type { ${Pascal}Repository } from '../domain/${kebab}.repository.js'
import { ${Pascal}, type ${Pascal}Props } from '../domain/${kebab}.entity.js'
import type { Create${Pascal}Dto, Update${Pascal}Dto } from './${kebab}.dto.js'
import { randomUUID } from 'node:crypto'

@ApplicationService()
export class ${Pascal}AppService {
  constructor(private readonly ${c}Repository: ${Pascal}Repository) {}

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
}

function simplifyController(Pascal: string, kebab: string): string {
  return `import { Body, Controller, Delete, Get, Injectable, Param, Post, Put } from '@banana-universe/bananajs'
import type { Request, Response } from 'express'
import { SuccessResponse } from '@banana-universe/bananajs'
import { ${Pascal}AppService } from './application/${kebab}.app-service.js'
import type { Create${Pascal}Dto, Update${Pascal}Dto } from './application/${kebab}.dto.js'

@Injectable()
@Controller('/${kebab}')
export class ${Pascal}Controller {
  constructor(private readonly app: ${Pascal}AppService) {}

  @Get('/')
  async list(_req: Request, res: Response): Promise<void> {
    const data = await this.app.findAll()
    new SuccessResponse(data).send(res)
  }

  @Get('/:id')
  async one(@Param('id') id: string, _req: Request, res: Response): Promise<void> {
    const data = await this.app.findOne(id)
    new SuccessResponse(data).send(res)
  }

  @Post('/')
  async create(@Body() dto: Create${Pascal}Dto, _req: Request, res: Response): Promise<void> {
    const data = await this.app.create(dto)
    new SuccessResponse(data).send(res)
  }

  @Put('/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: Update${Pascal}Dto,
    _req: Request,
    res: Response,
  ): Promise<void> {
    const data = await this.app.update(id, dto)
    new SuccessResponse(data).send(res)
  }

  @Delete('/:id')
  async remove(@Param('id') id: string, _req: Request, res: Response): Promise<void> {
    await this.app.remove(id)
    new SuccessResponse({ ok: true }).send(res)
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
import { ${Pascal} } from '../../domain/${kebab}.entity.js'
import { ${Pascal}OrmEntity } from './${kebab}.orm-entity.js'

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

function prismaRepo(Pascal: string, kebab: string): string {
  const modelAccessor = camel(Pascal)
  return `import type { PrismaClient } from '@prisma/client'
import { PrismaRepositoryAdapter } from '@banana-universe/plugin-prisma'
import { ${Pascal} } from '../../domain/${kebab}.entity.js'

/** Prisma model must match \`model ${Pascal}\` in schema.prisma — client delegate: prisma.${modelAccessor} */
type ${Pascal}Row = {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export class ${Pascal}PrismaRepository extends PrismaRepositoryAdapter<${Pascal}, ${Pascal}Row> {
  constructor(prisma: PrismaClient) {
    super(prisma.${modelAccessor} as never)
  }

  toDomain(row: ${Pascal}Row): ${Pascal} {
    return new ${Pascal}({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }

  toPersistence(domain: ${Pascal}): ${Pascal}Row {
    return {
      id: domain.id as string,
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
import type { ${Pascal}Repository } from '../domain/${kebab}.repository.js'
import { ${Pascal} } from '../domain/${kebab}.entity.js'

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
