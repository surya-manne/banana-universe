import 'reflect-metadata'
import type { Request, Response } from 'express'
import { Controller, Get, Post, Public, SuccessResponse } from '@banana-universe/bananajs'
import { ZodBody } from '@banana-universe/plugin-zod'
import { CreateArticleSchema } from './article.schema.js'
import type { PrismaClient } from '@prisma/client'

@Controller('/articles')
export class ArticleController {
  constructor(private readonly prisma: PrismaClient) {}

  @Get('/healthz')
  @Public()
  health(_req: Request, res: Response) {
    return new SuccessResponse('ok', { status: 'up' }).send(res)
  }

  @Post('/')
  @ZodBody(CreateArticleSchema)
  async create(req: Request, res: Response) {
    const { title, body } = req.body as { title: string; body: string }
    const created = await this.prisma.article.create({
      data: { title, body },
    })
    return new SuccessResponse('created', { id: created.id, title: created.title }).send(res)
  }
}
