import 'reflect-metadata'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { BananaApp } from '../App.js'
import { Post } from '../../Router/Route.decorator.js'
import { Controller } from '../../Router/Controller.decorator.js'

@Controller('echo')
class EchoController {
  @Post('')
  echo() {
    return { ok: true }
  }
}

// ─── Body size limit ─────────────────────────────────────────────────────────

describe('Body size limit', () => {
  const app = new BananaApp({
    controllers: [EchoController],
    bodyLimit: '100b',              // very small for test purposes
    security: { helmet: false, cors: false },
    logger: false,
    gracefulShutdown: false,
    rateLimit: false,
    requestId: false,
  })
  const agent = request(app.getInstance())

  it('rejects a JSON body that exceeds bodyLimit with 413', async () => {
    const oversized = JSON.stringify({ msg: 'a'.repeat(200) })
    const res = await agent
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send(oversized)

    assert.equal(
      res.status,
      413,
      `Expected 413 Payload Too Large but got ${res.status}`,
    )
  })

  it('accepts a JSON body within bodyLimit', async () => {
    const res = await agent
      .post('/echo')
      .send({ msg: 'hi' })

    assert.equal(res.status, 200)
  })
})

// ─── urlencoded prototype pollution guard ────────────────────────────────────

describe('urlencoded — prototype pollution', () => {
  const app = new BananaApp({
    controllers: [EchoController],
    security: { helmet: false, cors: false },
    logger: false,
    gracefulShutdown: false,
    rateLimit: false,
    requestId: false,
  })
  const agent = request(app.getInstance())

  it('does not pollute Object.prototype via __proto__ urlencoded key', async () => {
    // Delete any previous pollution marker
    delete (Object.prototype as Record<string, unknown>)['polluted']

    await agent
      .post('/echo')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('__proto__[polluted]=true&msg=test')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert.equal((Object.prototype as any)['polluted'], undefined,
      'Object.prototype should not have been polluted')
  })
})
