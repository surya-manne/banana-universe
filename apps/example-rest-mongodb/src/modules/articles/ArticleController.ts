import 'reflect-metadata'
import type { Request, Response } from 'express'
import type { Model } from 'mongoose'
import { inject } from 'tsyringe'
import { BaseController, Body, Controller, Get, Post, Public } from '@banana-universe/bananajs'
import type { ArticleDoc } from './ArticleModel.js'
import { ArticleModelToken } from './ArticleModel.js'
import { CreateArticleSchema } from './ArticleSchema.js'

@Controller('articles')
export class ArticleController extends BaseController {
  constructor(@inject(ArticleModelToken) private readonly articleModel: Model<ArticleDoc>) {
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
    const created = await this.articleModel.create({ title, body })
    return this.ok(res, 'created', { id: String(created._id), title: created.title })
  }
}
