import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BANANAJS_AI_RULES_MARKDOWN } from '../lib/llm/bananajs-ai-rules.js'
import { LEGACY_FLAT_GENERATE_SYSTEM_PROMPT } from '../lib/llm/prompts/generate-from-prompt.js'
import { ENTITY_EXTRACTION_SYSTEM } from '../lib/llm/prompts/extraction.js'
import { mergeBananarc, PROVIDER_DEFAULT_MODELS } from '../lib/llm/bananarc.js'
import { resolveLlmProvider } from '../lib/llm/provider.factory.js'
import { VercelAiProvider } from '../lib/llm/VercelAiProvider.js'

test('bundled AI rules include required section headers', () => {
  for (const h of ['## Module layout', '## ORM boundaries', '## Security']) {
    assert.ok(BANANAJS_AI_RULES_MARKDOWN.includes(h), `missing ${h}`)
  }
})

test('shared rules are injected into flat generate and extraction prompts', () => {
  assert.ok(LEGACY_FLAT_GENERATE_SYSTEM_PROMPT.includes('BANANAJS_AI_RULES'))
  assert.ok(ENTITY_EXTRACTION_SYSTEM.includes('BANANAJS_AI_RULES'))
})

// ── resolveLlmProvider ─────────────────────────────────────────────────────

test('resolveLlmProvider returns VercelAiProvider for gemini', () => {
  const provider = resolveLlmProvider({ llm: { provider: 'gemini' } })
  assert.ok(provider instanceof VercelAiProvider)
})

test('resolveLlmProvider returns VercelAiProvider for mistral', () => {
  const provider = resolveLlmProvider({ llm: { provider: 'mistral' } })
  assert.ok(provider instanceof VercelAiProvider)
})

test('resolveLlmProvider returns VercelAiProvider for groq', () => {
  const provider = resolveLlmProvider({ llm: { provider: 'groq' } })
  assert.ok(provider instanceof VercelAiProvider)
})

// ── mergeBananarc model fallback ───────────────────────────────────────────

test('mergeBananarc uses ollama default model when no provider set', () => {
  const config = mergeBananarc({})
  assert.equal(config.llm?.model, PROVIDER_DEFAULT_MODELS.ollama)
})

test('mergeBananarc selects gemini default model when provider is gemini', () => {
  const config = mergeBananarc({ llm: { provider: 'gemini' } })
  assert.equal(config.llm?.model, PROVIDER_DEFAULT_MODELS.gemini)
})

test('mergeBananarc selects mistral default model when provider is mistral', () => {
  const config = mergeBananarc({ llm: { provider: 'mistral' } })
  assert.equal(config.llm?.model, PROVIDER_DEFAULT_MODELS.mistral)
})

test('mergeBananarc selects groq default model when provider is groq', () => {
  const config = mergeBananarc({ llm: { provider: 'groq' } })
  assert.equal(config.llm?.model, PROVIDER_DEFAULT_MODELS.groq)
})

test('mergeBananarc respects explicit model even when provider is set', () => {
  const config = mergeBananarc({ llm: { provider: 'gemini', model: 'gemini-1.5-pro' } })
  assert.equal(config.llm?.model, 'gemini-1.5-pro')
})
