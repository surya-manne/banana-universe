function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function generateController(name: string): string {
  const className = `${capitalize(name)}Controller`
  const routePath = name.toLowerCase()
  return `import { BaseController, Controller, Get, Post, Put, Delete } from '@banana-universe/bananajs'
import { Request, Response } from 'express'

@Controller('${routePath}')
export class ${className} extends BaseController {
  constructor() {
    super()
  }

  @Get('')
  async findAll(_req: Request, res: Response): Promise<void> {
    // TODO: implement findAll
  }

  @Get(':id')
  async findOne(_req: Request, _res: Response): Promise<void> {
    // TODO: implement findOne
  }

  @Post('')
  async create(_req: Request, _res: Response): Promise<void> {
    // TODO: implement create
  }

  @Put(':id')
  async update(_req: Request, _res: Response): Promise<void> {
    // TODO: implement update
  }

  @Delete(':id')
  async remove(_req: Request, _res: Response): Promise<void> {
    // TODO: implement remove
  }
}
`
}

export function generateDto(name: string): string {
  const schemaName = `${capitalize(name)}Schema`
  return `import { z } from 'zod'

export const ${schemaName} = z.object({
  name: z.string().min(1),
})
`
}

export function generateMiddleware(name: string): string {
  const fnName = `${name.charAt(0).toLowerCase()}${name.slice(1)}Middleware`
  return `import { Request, Response, NextFunction } from 'express'

export const ${fnName} = (req: Request, _res: Response, next: NextFunction): void => {
  // TODO: implement ${name} middleware
  next()
}
`
}
