import 'reflect-metadata'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { BananaApp } from '@banana-universe/bananajs'
import { createContainer, asFunction } from 'awilix'
import { PrismaPlugin } from '@banana-universe/plugin-prisma'
import { PrismaClient } from '@prisma/client'
import { ArticleController } from '../article.controller.js'

test('health without MongoDB (CI default)', async () => {
  const prisma = new PrismaClient()
  const container = createContainer()
  container.register({
    prisma: asFunction(() => prisma).singleton(),
    articleController: asFunction(
      (cradle: { prisma: PrismaClient }) => new ArticleController(cradle.prisma),
    ).singleton(),
  })

  const banana = await BananaApp.create([ArticleController as never], {
    container,
    plugins: [PrismaPlugin(prisma) as never],
    logger: false,
    gracefulShutdown: false,
    rateLimit: false,
    requestId: false,
    security: { helmet: false, cors: false },
  })

  const res = await request(banana.getInstance()).get('/articles/healthz').expect(200)
  assert.equal(res.body.data.status, 'up')
  await prisma.$disconnect().catch(() => undefined)
})
