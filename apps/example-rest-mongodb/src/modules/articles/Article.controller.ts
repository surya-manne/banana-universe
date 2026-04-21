import 'reflect-metadata'
import type { Request, Response } from 'express'
import { inject, injectable } from 'tsyringe'
import { BaseController, Body, Controller, Get, Post, Public } from '@banana-universe/bananajs'
import { ArticleAppService } from './Article.service.js'
import { CreateArticleSchema } from './Article.dto.js'

@injectable()
@Controller('articles')
export class ArticleController extends BaseController {
  constructor(@inject(ArticleAppService) private readonly articleAppService: ArticleAppService) {
    super()
  }

  @Get('healthz')
  @Public()
  health(_req: Request, res: Response) {
    return this.ok(res, 'ok', { status: 'up' })
  }

  @Post('')
  @Body(CreateArticleSchema)
  async create(req: Request, res: Response) {
    const { title, body } = req.body as { title: string; body: string }
    const created = await this.articleAppService.create(title, body)
    return this.ok(res, 'created', { id: created.id, title: created.title })
  }
}
