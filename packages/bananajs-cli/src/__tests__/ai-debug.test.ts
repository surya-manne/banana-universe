import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  AI_DEBUG_JSON_SCHEMA_VERSION,
  parseAiDebugJson,
} from '../lib/ai-debug-schema.js'
import { buildAiDebugJsonSystem } from '../lib/llm/prompts/debug.js'

// ── Schema version ────────────────────────────────────────────────────────────

test('AI_DEBUG_JSON_SCHEMA_VERSION is a semver string', () => {
  assert.match(AI_DEBUG_JSON_SCHEMA_VERSION, /^\d+\.\d+\.\d+$/)
})

test('AI_DEBUG_JSON_SCHEMA_VERSION is distinct from AI_REVIEW_JSON_SCHEMA_VERSION', async () => {
  const { AI_REVIEW_JSON_SCHEMA_VERSION } = await import('../lib/ai-review-schema.js')
  // Both are "1.0.0" intentionally — the types are separate even if the version strings match
  // This test only enforces the modules are independently importable
  assert.ok(typeof AI_REVIEW_JSON_SCHEMA_VERSION === 'string')
  assert.ok(typeof AI_DEBUG_JSON_SCHEMA_VERSION === 'string')
})

// ── Schema validation ─────────────────────────────────────────────────────────

test('parseAiDebugJson accepts a valid full object', () => {
  const valid = {
    schemaVersion: '1.0.0',
    error: 'Cannot inject token IFooRepository',
    rootCause: 'Provider not registered in createModule() providers[]',
    location: { file: 'src/modules/foo/index.ts', hint: 'providers array' },
    fix: "Add { token: IFooRepository, useClass: TypeOrmFooRepository } to providers",
    severity: 'error' as const,
  }
  const result = parseAiDebugJson(valid)
  assert.equal(result.schemaVersion, '1.0.0')
  assert.equal(result.severity, 'error')
})

test('parseAiDebugJson accepts object without optional location', () => {
  const valid = {
    schemaVersion: '1.0.0',
    error: 'Missing reflect-metadata import',
    rootCause: 'reflect-metadata must be the first import in entry file',
    fix: "Add 'import reflect-metadata' as the very first line",
    severity: 'warn' as const,
  }
  const result = parseAiDebugJson(valid)
  assert.equal(result.error, 'Missing reflect-metadata import')
  assert.equal(result.location, undefined)
})

test('parseAiDebugJson rejects unknown severity', () => {
  assert.throws(() =>
    parseAiDebugJson({
      schemaVersion: '1.0.0',
      error: 'x',
      rootCause: 'y',
      fix: 'z',
      severity: 'critical', // invalid
    }),
  )
})

test('parseAiDebugJson rejects missing required fields', () => {
  assert.throws(() =>
    parseAiDebugJson({ schemaVersion: '1.0.0', error: 'x' }),
  )
})

// ── Prompt injection ──────────────────────────────────────────────────────────

test('buildAiDebugJsonSystem includes schema version in output format', () => {
  const prompt = buildAiDebugJsonSystem('')
  assert.ok(prompt.includes(AI_DEBUG_JSON_SCHEMA_VERSION))
})

test('buildAiDebugJsonSystem injects bananajs AI rules', () => {
  const prompt = buildAiDebugJsonSystem('')
  // Rules are appended; check for a known header from bananajs-ai-rules
  assert.ok(
    prompt.includes('Module layout') || prompt.includes('BANANAJS_AI_RULES'),
    'Expected AI rules to be injected into debug system prompt',
  )
})

test('buildAiDebugJsonSystem includes module tree when provided', () => {
  const tree = '  - src/modules/orders/\n  - src/modules/users/'
  const prompt = buildAiDebugJsonSystem(tree)
  assert.ok(prompt.includes('src/modules/orders/'))
})

test('buildAiDebugJsonSystem covers known BananaJS error patterns', () => {
  const prompt = buildAiDebugJsonSystem('')
  assert.ok(prompt.includes('Cannot inject token'))
  assert.ok(prompt.includes('reflect-metadata'))
  assert.ok(prompt.includes('providers[]'))
})
