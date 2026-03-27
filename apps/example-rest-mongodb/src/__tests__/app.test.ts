import 'reflect-metadata'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import mongoose from 'mongoose'
import { asFunction } from 'awilix'
import { BananaApp, defineBananaAppOptions } from '@banana-universe/bananajs'
import { MongoosePlugin } from '@banana-universe/plugin-mongoose'
import { ArticleController } from '../article.controller.js'
import { getArticleModel } from '../article.model.js'
import type { ArticleDoc } from '../article.model.js'
import type { Model } from 'mongoose'

test('health without live MongoDB (CI default)', async () => {
  const uri = process.env.DATABASE_URL ?? 'mongodb://127.0.0.1:27017/ci_dummy'
  const connection = mongoose.createConnection(uri)
  const articleModel = getArticleModel(connection)

  const banana = await BananaApp.create([ArticleController as never], {
    ...defineBananaAppOptions({
      services: {
        articleModel: asFunction(() => articleModel).singleton(),
        articleController: asFunction(
          (cradle: { articleModel: Model<ArticleDoc> }) =>
            new ArticleController(cradle.articleModel),
        ).singleton(),
      },
      plugins: [MongoosePlugin(connection) as never],
      logger: false,
      gracefulShutdown: false,
      rateLimit: false,
      requestId: false,
      security: { helmet: false, cors: false },
    }),
  })

  const res = await request(banana.getInstance()).get('/articles/healthz').expect(200)
  assert.equal(res.body.data.status, 'up')
  await connection.close().catch(() => undefined)
})
