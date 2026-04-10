import 'reflect-metadata'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { BananaApp } from '../App.js'
import {  Get } from '../../Router/Route.decorator.js'
import { Controller } from 'src/lib/Router/Controller.decorator.js'

@Controller('ping')
class PingController {
  @Get('')
  ping() {
    return { ok: true }
  }
}

// ─── Security headers with helmet enabled ───────────────────────────────────

describe('Security headers — helmet enabled', () => {
  const app = new BananaApp({
    controllers: [PingController],
    security: { helmet: true, cors: false },
    logger: false,
    gracefulShutdown: false,
    rateLimit: false,
    requestId: false,
  })
  const agent = request(app.getInstance())

  it('sets X-Content-Type-Options: nosniff', async () => {
    const res = await agent.get('/ping')
    assert.equal(res.headers['x-content-type-options'], 'nosniff')
  })

  it('sets X-Frame-Options', async () => {
    const res = await agent.get('/ping')
    assert.ok(
      res.headers['x-frame-options'] !== undefined,
      'Expected X-Frame-Options header to be present',
    )
  })

  it('sets X-DNS-Prefetch-Control: off', async () => {
    const res = await agent.get('/ping')
    assert.equal(res.headers['x-dns-prefetch-control'], 'off')
  })
})

// ─── CORS wildcard warning ───────────────────────────────────────────────────

describe('CORS wildcard warning', () => {
  it('logs a warning when cors is enabled without an origin restriction', () => {
    const warnings: string[] = []
    const mockLogger = {
      info: () => undefined,
      warn: (msg: string) => warnings.push(msg),
      error: () => undefined,
      debug: () => undefined,
    }

    new BananaApp({
      controllers: [PingController],
      // cors enabled but no origin provided — wildcard
      security: { helmet: false, cors: {} },
      logger: mockLogger,
      gracefulShutdown: false,
      rateLimit: false,
      requestId: false,
    })

    const found = warnings.some((w) => w.includes('origin restriction'))
    assert.ok(found, `Expected a CORS wildcard warning but got: ${JSON.stringify(warnings)}`)
  })

  it('does not warn when cors is disabled', () => {
    const warnings: string[] = []
    const mockLogger = {
      info: () => undefined,
      warn: (msg: string) => warnings.push(msg),
      error: () => undefined,
      debug: () => undefined,
    }

    new BananaApp({
      controllers: [PingController],
      security: { helmet: false, cors: false },
      logger: mockLogger,
      gracefulShutdown: false,
      rateLimit: false,
      requestId: false,
    })

    const found = warnings.some((w) => w.includes('origin restriction'))
    assert.ok(!found, 'Did not expect a CORS warning when cors is disabled')
  })

  it('does not warn when cors has an explicit origin', () => {
    const warnings: string[] = []
    const mockLogger = {
      info: () => undefined,
      warn: (msg: string) => warnings.push(msg),
      error: () => undefined,
      debug: () => undefined,
    }

    new BananaApp({
      controllers: [PingController],
      security: { helmet: false, cors: { origin: 'https://example.com' } },
      logger: mockLogger,
      gracefulShutdown: false,
      rateLimit: false,
      requestId: false,
    })

    const found = warnings.some((w) => w.includes('origin restriction'))
    assert.ok(!found, 'Did not expect a CORS warning when origin is explicitly set')
  })
})
