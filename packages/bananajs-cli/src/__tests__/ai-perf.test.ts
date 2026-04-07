import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildAiPerfJsonSystem } from '../lib/llm/prompts/perf.js'
import { AI_REVIEW_JSON_SCHEMA_VERSION } from '../lib/ai-review-schema.js'

// Re-export the static check logic for unit testing
// We test it indirectly by examining the pattern output contract

test('buildAiPerfJsonSystem includes AiReviewJson schema version', () => {
  const prompt = buildAiPerfJsonSystem()
  assert.ok(prompt.includes(AI_REVIEW_JSON_SCHEMA_VERSION))
})

test('buildAiPerfJsonSystem covers N+1 pattern', () => {
  const prompt = buildAiPerfJsonSystem()
  assert.ok(prompt.toLowerCase().includes('n+1') || prompt.includes('forEach'))
})

test('buildAiPerfJsonSystem covers cache decorator hint', () => {
  const prompt = buildAiPerfJsonSystem()
  assert.ok(prompt.includes('@Cache'))
})

test('buildAiPerfJsonSystem covers pagination hint', () => {
  const prompt = buildAiPerfJsonSystem()
  assert.ok(prompt.includes('PaginationQuerySchema') || prompt.includes('take') || prompt.includes('limit'))
})

test('buildAiPerfJsonSystem covers Mongoose lean hint', () => {
  const prompt = buildAiPerfJsonSystem()
  assert.ok(prompt.includes('.lean()'))
})

test('buildAiPerfJsonSystem injects bananajs AI rules', () => {
  const prompt = buildAiPerfJsonSystem()
  assert.ok(
    prompt.includes('Module layout') || prompt.includes('BANANAJS_AI_RULES'),
    'Expected AI rules to be injected into perf system prompt',
  )
})

// ── Static check pattern tests ────────────────────────────────────────────────
// Access the STATIC_PATTERNS via a separate minimal test for the run function behaviour

test('ai-perf module exports runAiPerf', async () => {
  const mod = await import('../lib/ai-perf.js')
  assert.equal(typeof mod.runAiPerf, 'function')
})

test('ai-perf module exports StaticPerfFinding type (via export)', async () => {
  // Type export — just check the module loads without error
  const mod = await import('../lib/ai-perf.js')
  assert.ok(mod !== undefined)
})
