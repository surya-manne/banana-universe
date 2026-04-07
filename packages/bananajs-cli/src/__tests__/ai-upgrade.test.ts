import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  UPGRADE_MANIFEST,
  SAFE_APPLY_IDS,
} from '../lib/ai-upgrade-manifest.js'

// ── Manifest integrity ────────────────────────────────────────────────────────

test('UPGRADE_MANIFEST is a non-empty array', () => {
  assert.ok(Array.isArray(UPGRADE_MANIFEST))
  assert.ok(UPGRADE_MANIFEST.length > 0)
})

test('all manifest entries have required fields', () => {
  for (const entry of UPGRADE_MANIFEST) {
    assert.ok(typeof entry.id === 'string', `id missing on ${JSON.stringify(entry)}`)
    assert.ok(typeof entry.sinceVersion === 'string', `sinceVersion missing on ${entry.id}`)
    assert.ok(typeof entry.description === 'string', `description missing on ${entry.id}`)
    assert.ok(entry.detect instanceof RegExp, `detect not a RegExp on ${entry.id}`)
    assert.ok(typeof entry.docsRef === 'string', `docsRef missing on ${entry.id}`)
  }
})

test('manifest IDs are unique', () => {
  const ids = UPGRADE_MANIFEST.map((e) => e.id)
  const unique = new Set(ids)
  assert.equal(unique.size, ids.length, 'Duplicate manifest IDs found')
})

test('SAFE_APPLY_IDS only contains IDs with non-null safeFix', () => {
  for (const id of SAFE_APPLY_IDS) {
    const entry = UPGRADE_MANIFEST.find((e) => e.id === id)
    assert.ok(entry, `SAFE_APPLY_IDS has unknown id: ${id}`)
    assert.ok(entry.safeFix !== null, `SAFE_APPLY_IDS includes ${id} but safeFix is null`)
  }
})

// ── Detection regex tests ─────────────────────────────────────────────────────

test('class-validator-import pattern detects class-validator import', () => {
  const entry = UPGRADE_MANIFEST.find((e) => e.id === 'class-validator-import')!
  assert.ok(entry)
  assert.ok(entry.detect.test("import { IsEmail } from 'class-validator'"))
})

test('controller-leading-slash pattern detects @Controller with slash', () => {
  const entry = UPGRADE_MANIFEST.find((e) => e.id === 'controller-leading-slash')!
  assert.ok(entry)
  assert.ok(entry.detect.test("@Controller('/users')"))
  assert.ok(!entry.detect.test("@Controller('users')"))
})

test('controller-leading-slash safe fix removes leading slash', () => {
  const entry = UPGRADE_MANIFEST.find((e) => e.id === 'controller-leading-slash')!
  assert.ok(entry.safeFix !== null)
  const fixed = entry.safeFix!("@Controller('/users')")
  assert.ok(!fixed.includes("('/users')"), `Expected slash removed, got: ${fixed}`)
  assert.ok(fixed.includes("('users')"), `Expected 'users' segment, got: ${fixed}`)
})

test('route-decorator-leading-slash safe fix removes leading slash from @Get', () => {
  const entry = UPGRADE_MANIFEST.find((e) => e.id === 'route-decorator-leading-slash')!
  assert.ok(entry.safeFix !== null)
  const fixed = entry.safeFix!("@Get('/list')")
  assert.ok(!fixed.includes("('/list')"), `Expected slash removed, got: ${fixed}`)
  assert.ok(fixed.includes("('list')"), `Expected 'list' segment, got: ${fixed}`)
})

test('plugin-zod-decorators safe fix replaces @ZodBody with @Body', () => {
  const entry = UPGRADE_MANIFEST.find((e) => e.id === 'plugin-zod-decorators')!
  assert.ok(entry.safeFix !== null)
  const fixed = entry.safeFix!('@ZodBody(MySchema)')
  assert.equal(fixed, '@Body(MySchema)')
})

test('awilix-import pattern detects awilix import', () => {
  const entry = UPGRADE_MANIFEST.find((e) => e.id === 'awilix-import')!
  assert.ok(entry)
  assert.ok(entry.detect.test("import { createContainer } from 'awilix'"))
  assert.ok(!entry.detect.test("import { injectable } from 'tsyringe'"))
})

test('create-banana-container pattern detects removed function', () => {
  const entry = UPGRADE_MANIFEST.find((e) => e.id === 'create-banana-container')!
  assert.ok(entry)
  assert.ok(entry.detect.test('createBananaContainer(opts)'))
})

// ── runAiUpgrade export ───────────────────────────────────────────────────────

test('ai-upgrade module exports runAiUpgrade', async () => {
  const mod = await import('../lib/ai-upgrade.js')
  assert.equal(typeof mod.runAiUpgrade, 'function')
})
