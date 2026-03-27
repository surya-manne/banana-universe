import 'reflect-metadata'
import type { Request, Response } from 'express'
import { BaseController, Body, Controller, Get, Post, Public } from '@banana-universe/bananajs'
import { CreateArticleSchema } from './article.schema.js'
import type { PrismaClient } from '@prisma/client'

@Controller('articles')
export class ArticleController extends BaseController {
  constructor(private readonly prisma: PrismaClient) {
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
    const created = await this.prisma.article.create({
      data: { title, body },
    })
    return this.ok(res, 'created', { id: created.id, title: created.title })
  }
}
