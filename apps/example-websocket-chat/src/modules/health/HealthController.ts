import 'reflect-metadata'
import type { Request, Response } from 'express'
import { BaseController, Controller, Get, Public } from '@banana-universe/bananajs'

@Controller('')
export class HealthController extends BaseController {
  @Get('health')
  @Public()
  health(_req: Request, res: Response) {
    return this.ok(res, 'ok', { status: 'up' })
  }
}
