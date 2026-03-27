import 'reflect-metadata'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createExampleApp, buildTypeOrmOptions } from '../bootstrap.js'

test('catalog CRUD with sql.js + Bearer auth', async () => {
  const banana = await createExampleApp({
    typeorm: buildTypeOrmOptions('sqljs'),
    enableOtel: false,
  })
  const app = banana.getInstance()

  const token = 'Bearer test-token'
  const createRes = await request(app)
    .post('/catalog/items')
    .set('Authorization', token)
    .send({ name: 'Widget', sku: 'W-1' })
    .expect(200)

  assert.equal(createRes.body.data.name, 'Widget')

  const listRes = await request(app)
    .get('/catalog/items?page=1&limit=10')
    .set('Authorization', token)
    .expect(200)

  assert.equal(listRes.body.meta.total >= 1, true)
  const id = listRes.body.data[0].id as string

  const getRes = await request(app)
    .get(`/catalog/items/${id}`)
    .set('Authorization', token)
    .expect(200)

  assert.equal(getRes.body.data.sku, 'W-1')

  await request(app).get('/catalog/healthz').expect(200)
})
