import type { Request, Response } from 'express'
import { BaseController, Controller, Get, Public } from '@banana-universe/bananajs'

/** Mongo-backed feature slice (Mongoose plugin registered in bootstrap). */
@Controller('tags')
export class TagController extends BaseController {
  @Get('healthz')
  @Public()
  health(_req: Request, res: Response) {
    return this.ok(res, 'ok', { status: 'up', stack: 'mongoose' })
  }
}
