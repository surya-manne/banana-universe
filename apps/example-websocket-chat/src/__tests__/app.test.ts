import 'reflect-metadata'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createChatApp } from '../bootstrap.js'

test('HTTP health for BananaTestApp-style smoke test', async () => {
  const { banana } = await createChatApp()
  const res = await request(banana.getInstance()).get('/health').expect(200)
  assert.equal(res.body.data.status, 'up')
})
