import 'reflect-metadata'
import { createContainer, asFunction } from 'awilix'
import { BananaApp, type Constructor } from '@banana-universe/bananajs'
import { PrismaPlugin } from '@banana-universe/plugin-prisma'
import { ZodPlugin } from '@banana-universe/plugin-zod'
import { PrismaClient } from '@prisma/client'
import { ArticleController } from './article.controller.js'

export async function createMongoApp(): Promise<BananaApp> {
  const prisma = new PrismaClient()
  const container = createContainer()
  container.register({
    prisma: asFunction(() => prisma).singleton(),
    articleController: asFunction(
      (cradle: { prisma: PrismaClient }) => new ArticleController(cradle.prisma),
    ).singleton(),
  })

  return BananaApp.create([ArticleController as unknown as Constructor], {
    container,
    plugins: [
      PrismaPlugin(prisma) as import('@banana-universe/bananajs').BananaPlugin,
      ZodPlugin() as import('@banana-universe/bananajs').BananaPlugin,
    ],
    logger: false,
    gracefulShutdown: false,
    rateLimit: false,
    requestId: false,
    security: { helmet: false, cors: false },
  })
}
