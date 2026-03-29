import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BANANAJS_AI_RULES_MARKDOWN } from '../lib/llm/bananajs-ai-rules.js'
import { LEGACY_FLAT_GENERATE_SYSTEM_PROMPT } from '../lib/llm/prompts/generate-from-prompt.js'
import { ENTITY_EXTRACTION_SYSTEM } from '../lib/llm/prompts/extraction.js'

test('bundled AI rules include required section headers', () => {
  for (const h of ['## Module layout', '## ORM boundaries', '## Security']) {
    assert.ok(BANANAJS_AI_RULES_MARKDOWN.includes(h), `missing ${h}`)
  }
})

test('shared rules are injected into flat generate and extraction prompts', () => {
  assert.ok(LEGACY_FLAT_GENERATE_SYSTEM_PROMPT.includes('BANANAJS_AI_RULES'))
  assert.ok(ENTITY_EXTRACTION_SYSTEM.includes('BANANAJS_AI_RULES'))
})
