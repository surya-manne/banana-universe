import 'reflect-metadata'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import mongoose from 'mongoose'
import { BananaApp, defineBananaAppOptions } from '@banana-universe/bananajs'
import { MongoosePlugin } from '@banana-universe/plugin-mongoose'
import { articlesModule } from '../modules/articles/index.js'

test('health without live MongoDB (CI default)', async () => {
  const uri = process.env.DATABASE_URL ?? 'mongodb://127.0.0.1:27017/ci_dummy'
  await mongoose.connect(uri)

  const banana = await BananaApp.create(
    defineBananaAppOptions({
      modules: [articlesModule],
      plugins: [MongoosePlugin(mongoose.connection) as never],
      logger: false,
      gracefulShutdown: false,
      rateLimit: false,
      requestId: false,
      security: { helmet: false, cors: false },
    }),
  )

  const res = await request(banana.getInstance()).get('/articles/healthz').expect(200)
  assert.equal(res.body.data.status, 'up')
  await mongoose.disconnect().catch(() => undefined)
})
