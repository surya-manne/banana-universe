import 'reflect-metadata'
import type { Request, Response } from 'express'
import { Controller, Get, Public, SuccessResponse } from '@banana-universe/bananajs'

@Controller('/')
export class HealthController {
  @Get('/health')
  @Public()
  health(_req: Request, res: Response) {
    return new SuccessResponse('ok', { status: 'up' }).send(res)
  }
}
