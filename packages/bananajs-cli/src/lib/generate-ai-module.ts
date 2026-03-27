import * as path from 'path'
import type { ModuleFile } from './generate-module.js'
import type { OrmChoice } from './generate-module.js'
import { toCamelCase, toKebabCase, toPascalCase } from './utils/naming.js'
import { normalizeExtractionType } from './utils/type-mapping.js'
import type { EntityExtraction } from './llm/entity-extraction.js'

interface NormalizedField {
  name: string
  ts: string
  optional: boolean
}

function normalizeFields(extraction: EntityExtraction): NormalizedField[] {
  return extraction.fields.map((f) => ({
    name: safeIdentifier(f.name),
    ts: normalizeExtractionType(f.type),
    optional: f.optional === true,
  }))
}

function safeIdentifier(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_$]/g, '_')
  const base = /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned
  return base || 'field'
}

function validatorDecorators(ts: string, required: boolean): string {
  if (ts === 'number') {
    return required ? '  @IsNumber()\n' : '  @IsOptional()\n  @IsNumber()\n'
  }
  if (ts === 'boolean') {
    return required ? '  @IsBoolean()\n' : '  @IsOptional()\n  @IsBoolean()\n'
  }
  if (ts === 'Date') {
    return required ? '  @IsDate()\n' : '  @IsOptional()\n  @IsDate()\n'
  }
  if (ts.endsWith('[]')) {
    return (
      (required ? '  @IsArray()\n' : '  @IsOptional()\n  @IsArray()\n') +
      '  @IsString({ each: true })\n'
    )
  }
  return required ? '  @IsNotEmpty()\n  @IsString()\n' : '  @IsOptional()\n  @IsString()\n'
}

function createDtoFields(fields: NormalizedField[]): string {
  return fields
    .map((f) => {
      const dec = validatorDecorators(f.ts, !f.optional)
      const opt = f.optional ? '?' : ''
      return `${dec}  ${f.name}${opt}: ${f.ts}`
    })
    .join('\n\n')
}

function updateDtoFields(fields: NormalizedField[]): string {
  return fields
    .map((f) => {
      const dec = validatorDecorators(f.ts, false)
      return `${dec}  ${f.name}?: ${f.ts}`
    })
    .join('\n\n')
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

function prismaRowFields(fields: NormalizedField[]): string {
  return fields.map((f) => `  ${f.name}: ${f.ts}`).join('\n')
}

function toDomainProps(fields: NormalizedField[]): string {
  return fields.map((f) => `      ${f.name}: orm.${f.name}`).join(',\n')
}

/**
 * Build DDD module files from LLM/schema extraction (Phase 7 multi-step generator).
 */
export function buildDddModuleFromExtraction(
  extraction: EntityExtraction,
  orm: OrmChoice,
): ModuleFile[] {
  const Pascal = toPascalCase(extraction.entityName)
  const kebab = toKebabCase(extraction.entityName)
  const c = toCamelCase(Pascal)
  const base = path.join(kebab)
  const fields = normalizeFields(extraction)

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
import type { ${Pascal} } from './${kebab}.entity.js'

export type ${Pascal}Repository = Repository<${Pascal}>
`

  const domainService = `import { DomainService } from '@banana-universe/ddd'
import type { ${Pascal} } from './${kebab}.entity.js'

@DomainService()
export class ${Pascal}DomainService {
  validate(_entity: ${Pascal}): void {
    // Domain invariants — extend as needed
  }
}
`

  const appDto = `import { IsArray, IsBoolean, IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class Create${Pascal}Dto {
${createDtoFields(fields) || '  @IsNotEmpty()\n  @IsString()\n  placeholder!: string'}
}

export class Update${Pascal}Dto {
${updateDtoFields(fields) || '  @IsOptional()\n  @IsString()\n  placeholder?: string'}
}
`

  const files: ModuleFile[] = [
    { relativePath: path.join(base, 'domain', `${kebab}.entity.ts`), content: domainEntity },
    { relativePath: path.join(base, 'domain', `${kebab}.repository.ts`), content: domainRepo },
    { relativePath: path.join(base, 'domain', `${kebab}.service.ts`), content: domainService },
    { relativePath: path.join(base, 'application', `${kebab}.dto.ts`), content: appDto },
    {
      relativePath: path.join(base, 'application', `${kebab}.app-service.ts`),
      content: buildAppService(Pascal, kebab, c, fields),
    },
    {
      relativePath: path.join(base, `${kebab}.controller.ts`),
      content: buildController(Pascal, kebab),
    },
  ]

  if (orm === 'typeorm') {
    files.push({
      relativePath: path.join(base, 'infrastructure', 'typeorm', `${kebab}.orm-entity.ts`),
      content: buildTypeormEntity(Pascal, kebab, fields),
    })
    files.push({
      relativePath: path.join(base, 'infrastructure', 'typeorm', `${kebab}.typeorm-repository.ts`),
      content: buildTypeormRepo(Pascal, kebab, fields),
    })
  } else if (orm === 'prisma') {
    files.push({
      relativePath: path.join(base, 'infrastructure', 'prisma', `${kebab}.prisma-repository.ts`),
      content: buildPrismaRepo(Pascal, kebab, fields),
    })
  } else {
    files.push({
      relativePath: path.join(base, 'infrastructure', `${kebab}.in-memory-repository.ts`),
      content: buildInMemoryRepo(Pascal, kebab, fields),
    })
  }

  return files
}

function buildAppService(
  Pascal: string,
  kebab: string,
  c: string,
  fields: NormalizedField[],
): string {
  const hasFields = fields.length > 0
  const createProps = hasFields
    ? `const props: ${Pascal}Props = {
      id: randomUUID(),
${fields.map((f) => `      ${f.name}: dto.${f.name}`).join(',\n')},
    }
    const entity = new ${Pascal}(props)
    return this.${c}Repository.save(entity)`
    : `throw new Error('No fields defined for entity')`

  const updateBlock = hasFields
    ? `const existing = await this.${c}Repository.findById(id)
    if (!existing) return null
    const props: ${Pascal}Props = {
      id: existing.id as string,
${fields
  .map((f) => `      ${f.name}: dto.${f.name} !== undefined ? dto.${f.name} : existing.${f.name}`)
  .join(',\n')},
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    }
    return this.${c}Repository.save(new ${Pascal}(props))`
    : `return null`

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
    ${createProps}
  }

  async update(id: string, dto: Update${Pascal}Dto): Promise<${Pascal} | null> {
    ${updateBlock}
  }

  async remove(id: string): Promise<void> {
    await this.${c}Repository.delete(id)
  }
}
`
}

function buildController(Pascal: string, kebab: string): string {
  return `import { Body, Controller, Delete, Get, Injectable, Param, Post, Put } from '@banana-universe/bananajs'
import { ApiTags } from '@banana-universe/bananajs'
import type { Request, Response } from 'express'
import { SuccessResponse } from '@banana-universe/bananajs'
import { ${Pascal}AppService } from './application/${kebab}.app-service.js'
import type { Create${Pascal}Dto, Update${Pascal}Dto } from './application/${kebab}.dto.js'

@Injectable()
@ApiTags('${kebab}')
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
${td},
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    })
  }

  toPersistence(domain: ${Pascal}): ${Pascal}OrmEntity {
    const row = new ${Pascal}OrmEntity()
    row.id = domain.id as string
${fields.map((f) => `    row.${f.name} = domain.${f.name}`).join('\n')}
    row.createdAt = domain.createdAt
    row.updatedAt = domain.updatedAt
    return row
  }
}
`
}

function buildPrismaRepo(Pascal: string, kebab: string, fields: NormalizedField[]): string {
  const modelAccessor = toCamelCase(Pascal)
  const rowFields = prismaRowFields(fields)
  return `import type { PrismaClient } from '@prisma/client'
import { PrismaRepositoryAdapter } from '@banana-universe/plugin-prisma'
import { ${Pascal} } from '../../domain/${kebab}.entity.js'

type ${Pascal}Row = {
  id: string
${rowFields}
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
${fields.map((f) => `      ${f.name}: row.${f.name}`).join(',\n')},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }

  toPersistence(domain: ${Pascal}): ${Pascal}Row {
    return {
      id: domain.id as string,
${fields.map((f) => `      ${f.name}: domain.${f.name}`).join(',\n')},
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    }
  }
}
`
}

function buildInMemoryRepo(Pascal: string, kebab: string, _fields: NormalizedField[]): string {
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
