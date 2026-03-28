import 'reflect-metadata'
import type { Request, Response } from 'express'
import { BaseController, Controller, Get, Public } from '@banana-universe/bananajs'

@Controller('api')
export class HealthController extends BaseController {
  @Get('health')
  @Public()
  health(_req: Request, res: Response) {
    return this.ok(res, 'ok', { bridge: 'fastify-express', stack: 'BananaJS on Express' })
  }
}
