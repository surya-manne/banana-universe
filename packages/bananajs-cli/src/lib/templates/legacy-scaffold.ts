/** Flat controller + DTO + service templates used by `ai generate --from-prompt` (non-DDD). */

export function generateControllerTemplate(entityName: string, _fields: string[]): string {
  return `import { Controller, Get, Post, Put, Delete, Body, Params } from '@banana-universe/bananajs'
import { ${entityName}Dto } from './${entityName.toLowerCase()}.dto.js'

@Controller('/${entityName.toLowerCase()}s')
export class ${entityName}Controller {
  @Get('/')
  async getAll() {
    // TODO: implement
  }

  @Get('/:id')
  async getById(@Params(${entityName}Dto) params: { id: string }) {
    // TODO: implement
  }

  @Post('/')
  async create(@Body(${entityName}Dto) body: ${entityName}Dto) {
    // TODO: implement
  }

  @Put('/:id')
  async update(@Params(${entityName}Dto) params: { id: string }, @Body(${entityName}Dto) body: Partial<${entityName}Dto>) {
    // TODO: implement
  }

  @Delete('/:id')
  async delete(@Params(${entityName}Dto) params: { id: string }) {
    // TODO: implement
  }
}
`
}

export function generateDtoTemplate(
  entityName: string,
  fields: Array<{ name: string; type: string }>,
): string {
  const fieldLines = fields.map((f) => `  @IsOptional()\n  ${f.name}?: ${f.type}`).join('\n\n')
  return `import { IsOptional } from 'class-validator'

export class ${entityName}Dto {
${fieldLines || '  // TODO: add fields'}
}
`
}

export function generateServiceTemplate(entityName: string): string {
  return `import { Injectable } from '@banana-universe/bananajs'

@Injectable()
export class ${entityName}Service {
  // TODO: inject repository and implement business logic
}
`
}
