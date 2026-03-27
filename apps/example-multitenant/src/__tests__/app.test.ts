import 'reflect-metadata'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createTenantApp, buildTypeOrmOptions } from '../bootstrap.js'

const auth = { Authorization: 'Bearer t' }

test('tenant-scoped notes and ABAC delete', async () => {
  const banana = await createTenantApp(buildTypeOrmOptions('sqljs'))
  const app = banana.getInstance()

  await request(app)
    .post('/notes')
    .set({ ...auth, 'x-tenant-id': 'acme', 'x-role': 'user' })
    .send({ title: 'Hello' })
    .expect(200)

  const list = await request(app)
    .get('/notes')
    .set({ ...auth, 'x-tenant-id': 'acme' })
    .expect(200)

  assert.equal(list.body.data.length, 1)
  const id = list.body.data[0].id as string

  await request(app)
    .delete(`/notes/${id}`)
    .set({ ...auth, 'x-tenant-id': 'acme', 'x-role': 'user' })
    .expect(403)

  await request(app)
    .delete(`/notes/${id}`)
    .set({ ...auth, 'x-tenant-id': 'acme', 'x-role': 'admin' })
    .expect(200)
})
