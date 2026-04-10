import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { BananaConfig } from '../BananaConfig.js'

// ─── Sensitive field serialisation guard ────────────────────────────────────

describe('BananaConfig — sensitive field toJSON guard', () => {
  before(() => {
    process.env['API_KEY'] = 'super-secret-key'
    process.env['DB_PASS'] = 'hunter2'
    process.env['APP_NAME'] = 'TestApp'
  })

  after(() => {
    delete process.env['API_KEY']
    delete process.env['DB_PASS']
    delete process.env['APP_NAME']
  })

  it('redacts sensitive fields in JSON.stringify output', () => {
    const config = BananaConfig({
      apiKey:  { env: 'API_KEY',   required: true, sensitive: true },
      dbPass:  { env: 'DB_PASS',   required: true, sensitive: true },
      appName: { env: 'APP_NAME',  required: true, sensitive: false },
    })

    const serialised = JSON.stringify(config.get())
    const parsed = JSON.parse(serialised) as Record<string, unknown>

    assert.equal(parsed['apiKey'],  '[REDACTED]', 'apiKey should be redacted')
    assert.equal(parsed['dbPass'],  '[REDACTED]', 'dbPass should be redacted')
    assert.equal(parsed['appName'], 'TestApp',    'appName should not be redacted')
  })

  it('returns real values when accessing via .get().fieldName', () => {
    const config = BananaConfig({
      apiKey:  { env: 'API_KEY',  required: true, sensitive: true },
      appName: { env: 'APP_NAME', required: true, sensitive: false },
    })

    assert.equal(config.get().apiKey,  'super-secret-key')
    assert.equal(config.get().appName, 'TestApp')
  })

  it('returns real values when accessing directly via property shortcut', () => {
    const config = BananaConfig({
      apiKey: { env: 'API_KEY', required: true, sensitive: true },
    })

    // BananaConfig exposes direct property shortcut: config.apiKey === config.get().apiKey
    assert.equal(
      (config as unknown as Record<string, unknown>)['apiKey'],
      'super-secret-key',
    )
  })

  it('does not redact non-sensitive fields at all', () => {
    const config = BananaConfig({
      appName: { env: 'APP_NAME', required: true },
    })

    const serialised = JSON.stringify(config.get())
    assert.ok(
      serialised.includes('TestApp'),
      'Non-sensitive field should appear in JSON output',
    )
  })
})
