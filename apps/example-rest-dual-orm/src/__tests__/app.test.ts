import 'reflect-metadata'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import mongoose from 'mongoose'
import { createDualOrmApp, buildTypeOrmOptions } from '../bootstrap.js'

test('health endpoints for both stacks (Mongo + TypeORM sqljs)', async () => {
  const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/ci_dummy'
  const banana = await createDualOrmApp({
    mongoUri: uri,
    typeorm: buildTypeOrmOptions('sqljs'),
  })
  const app = banana.getInstance()

  const tags = await request(app).get('/tags/healthz').expect(200)
  assert.equal(tags.body.data.status, 'up')
  assert.equal(tags.body.data.stack, 'mongoose')

  const widgets = await request(app).get('/widgets/healthz').expect(200)
  assert.equal(widgets.body.data.status, 'up')
  assert.equal(widgets.body.data.stack, 'typeorm')

  await request(app).get('/widgets/items?page=1&limit=10').expect(200)
  await mongoose.disconnect().catch(() => undefined)
})
