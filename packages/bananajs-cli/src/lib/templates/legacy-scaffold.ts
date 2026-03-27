/** Flat controller + DTO + service templates used by `ai generate --from-prompt` (non-DDD). */

export function generateControllerTemplate(entityName: string, _fields: string[]): string {
  return `import { BaseController, Controller, Get, Post, Put, Delete, Body, Params } from '@banana-universe/bananajs'
import type { Request, Response } from 'express'
import { ${entityName}Schema } from './${entityName.toLowerCase()}.dto.js'
import { z } from 'zod'

const idParams = z.object({ id: z.string().min(1) })

@Controller('${entityName.toLowerCase()}s')
export class ${entityName}Controller extends BaseController {
  constructor() {
    super()
  }

  @Get('')
  async getAll(_req: Request, res: Response) {
    // TODO: implement
  }

  @Get(':id')
  @Params(idParams)
  async getById(req: Request, res: Response) {
    const _id = (req.params as { id: string }).id
    // TODO: implement
  }

  @Post('')
  @Body(${entityName}Schema)
  async create(req: Request, res: Response) {
    // TODO: implement
  }

  @Put(':id')
  @Params(idParams)
  @Body(${entityName}Schema)
  async update(req: Request, res: Response) {
    // TODO: implement
  }

  @Delete(':id')
  @Params(idParams)
  async delete(req: Request, res: Response) {
    // TODO: implement
  }
}
`
}

export function generateDtoTemplate(
  entityName: string,
  fields: Array<{ name: string; type: string }>,
): string {
  const fieldLines = fields
    .map((f) => `  ${f.name}: z.${mapTsToZodPrimitive(f.type)}().optional()`)
    .join(',\n')
  return `import { z } from 'zod'

export const ${entityName}Schema = z.object({
${fieldLines || `  // TODO: add fields`}
})
`
}

function mapTsToZodPrimitive(ts: string): string {
  if (ts === 'number') return 'number'
  if (ts === 'boolean') return 'boolean'
  return 'string'
}

export function generateServiceTemplate(entityName: string): string {
  return `import { Injectable } from '@banana-universe/bananajs'

@Injectable()
export class ${entityName}Service {
  // TODO: inject repository and implement business logic
}
`
}
