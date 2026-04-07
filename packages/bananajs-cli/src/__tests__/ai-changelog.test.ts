import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildAiChangelogSystem } from '../lib/llm/prompts/changelog.js'

// ── buildAiChangelogSystem ───────────────────────────────────────────────────

test('buildAiChangelogSystem includes Breaking Changes section', () => {
  const prompt = buildAiChangelogSystem({ hasOpenApiDiff: false })
  assert.ok(prompt.includes('Breaking Changes'))
})

test('buildAiChangelogSystem includes New Features section', () => {
  const prompt = buildAiChangelogSystem({ hasOpenApiDiff: false })
  assert.ok(prompt.includes('New Features'))
})

test('buildAiChangelogSystem includes Bug Fixes section', () => {
  const prompt = buildAiChangelogSystem({ hasOpenApiDiff: false })
  assert.ok(prompt.includes('Bug Fixes'))
})

test('buildAiChangelogSystem adds OpenAPI diff note when hasOpenApiDiff is true', () => {
  const withDiff = buildAiChangelogSystem({ hasOpenApiDiff: true })
  const withoutDiff = buildAiChangelogSystem({ hasOpenApiDiff: false })
  assert.ok(withDiff.includes('OpenAPI'), 'Expected OpenAPI reference when hasOpenApiDiff=true')
  assert.ok(
    !withoutDiff.includes('OpenAPI spec diff'),
    'Expected no OpenAPI diff note when hasOpenApiDiff=false',
  )
})

test('buildAiChangelogSystem injects bananajs AI rules', () => {
  const prompt = buildAiChangelogSystem({ hasOpenApiDiff: false })
  assert.ok(
    prompt.includes('Module layout') || prompt.includes('BANANAJS_AI_RULES'),
    'Expected AI rules injected into changelog system prompt',
  )
})

test('buildAiChangelogSystem covers commit type mapping (feat/fix/breaking)', () => {
  const prompt = buildAiChangelogSystem({ hasOpenApiDiff: false })
  assert.ok(prompt.includes('feat:') || prompt.includes('feature:'))
  assert.ok(prompt.includes('fix:') || prompt.includes('bugfix:'))
  assert.ok(prompt.includes('BREAKING'))
})

// ── module export ─────────────────────────────────────────────────────────────

test('ai-changelog module exports runAiChangelog', async () => {
  const mod = await import('../lib/ai-changelog.js')
  assert.equal(typeof mod.runAiChangelog, 'function')
})
