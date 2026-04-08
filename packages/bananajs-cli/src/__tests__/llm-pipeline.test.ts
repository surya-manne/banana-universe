import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  LlmOperationError,
  runLlmOperation,
  type BaseCtx,
  type LlmOperation,
  type PipelineStage,
} from '../lib/llm/pipeline.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

interface TestCtx extends BaseCtx {
  log: string[]
}

function makeOp(
  overrides?: Partial<LlmOperation<Record<string, unknown>, TestCtx, string>>,
): LlmOperation<Record<string, unknown>, TestCtx, string> {
  return {
    name: 'test-op',
    async prepare(_opts) {
      return { log: ['prepare'], provider: null, providerAvailable: true, debug: false }
    },
    async research(ctx) {
      ctx.log.push('research')
      return ctx
    },
    async plan(ctx) {
      ctx.log.push('plan')
      return ctx
    },
    async act(ctx) {
      ctx.log.push('act')
      return ctx
    },
    async validate(ctx) {
      ctx.log.push('validate')
      return ctx.log.join(',')
    },
    ...overrides,
  }
}

// ── Stage ordering ────────────────────────────────────────────────────────────

test('runLlmOperation executes all 5 stages in order', async () => {
  const op = makeOp()
  const result = await runLlmOperation(op, {})
  assert.equal(result, 'prepare,research,plan,act,validate')
})

test('runLlmOperation returns value from validate()', async () => {
  const op = makeOp({
    async validate(_ctx) {
      return 'final-result'
    },
  })
  const result = await runLlmOperation(op, {})
  assert.equal(result, 'final-result')
})

// ── LlmOperationError wrapping ────────────────────────────────────────────────

for (const failStage of ['prepare', 'research', 'plan', 'act', 'validate'] as PipelineStage[]) {
  test(`LlmOperationError carries stage name: ${failStage}`, async () => {
    const boom = new Error(`boom in ${failStage}`)

    const overrides: Partial<LlmOperation<Record<string, unknown>, TestCtx, string>> = {}

    if (failStage === 'prepare') {
      overrides.prepare = async (_opts) => { throw boom }
    } else if (failStage === 'research') {
      overrides.research = async (_ctx) => { throw boom }
    } else if (failStage === 'plan') {
      overrides.plan = async (_ctx) => { throw boom }
    } else if (failStage === 'act') {
      overrides.act = async (_ctx) => { throw boom }
    } else {
      overrides.validate = async (_ctx) => { throw boom }
    }

    const op = makeOp(overrides)
    try {
      await runLlmOperation(op, {})
      assert.fail('should have thrown')
    } catch (e) {
      assert.ok(e instanceof LlmOperationError, 'should be LlmOperationError')
      assert.equal(e.stage, failStage)
      assert.equal(e.cause, boom)
      assert.ok(e.message.includes(failStage), 'message should include stage name')
    }
  })
}

// ── isProviderOptional: skip act when providerAvailable === false ─────────────

test('act() is skipped when isProviderOptional=true and providerAvailable=false', async () => {
  const actCalled: boolean[] = []
  const op = makeOp({
    isProviderOptional: true,
    async prepare(_opts) {
      return { log: ['prepare'], provider: null, providerAvailable: false, debug: false }
    },
    async act(ctx) {
      actCalled.push(true)
      ctx.log.push('act')
      return ctx
    },
  })

  const result = await runLlmOperation(op, {})
  assert.equal(actCalled.length, 0, 'act() must not be called')
  assert.ok(!result.includes('act'), 'act must not appear in result')
  assert.ok(result.includes('validate'), 'validate must still run')
})

test('act() runs when isProviderOptional=true and providerAvailable=true', async () => {
  const actCalled: boolean[] = []
  const op = makeOp({
    isProviderOptional: true,
    async prepare(_opts) {
      return { log: ['prepare'], provider: null, providerAvailable: true, debug: false }
    },
    async act(ctx) {
      actCalled.push(true)
      ctx.log.push('act')
      return ctx
    },
  })

  const result = await runLlmOperation(op, {})
  assert.equal(actCalled.length, 1, 'act() must be called once')
  assert.ok(result.includes('act'), 'act must appear in result')
})

test('act() always runs when isProviderOptional is not set, even if providerAvailable=false', async () => {
  const actCalled: boolean[] = []
  const op = makeOp({
    async prepare(_opts) {
      return { log: ['prepare'], provider: null, providerAvailable: false, debug: false }
    },
    async act(ctx) {
      actCalled.push(true)
      ctx.log.push('act')
      return ctx
    },
  })

  await runLlmOperation(op, {})
  assert.equal(actCalled.length, 1)
})

// ── Debug logging to stderr ───────────────────────────────────────────────────

test('debug=true emits stage names to stderr without throwing', async () => {
  const stderrChunks: string[] = []
  const original = process.stderr.write.bind(process.stderr)
  process.stderr.write = (chunk: string | Uint8Array) => {
    stderrChunks.push(String(chunk))
    return original(chunk)
  }

  try {
    const op = makeOp()
    await runLlmOperation(op, {}, true /* debug */)
    const combined = stderrChunks.join('')
    assert.ok(combined.includes('prepare'), 'stderr should mention prepare')
    assert.ok(combined.includes('validate'), 'stderr should mention validate')
  } finally {
    process.stderr.write = original
  }
})

// ── LlmOperationError properties ─────────────────────────────────────────────

test('LlmOperationError has correct name, stage, and cause', () => {
  const cause = new Error('inner')
  const err = new LlmOperationError('act', cause)
  assert.equal(err.name, 'LlmOperationError')
  assert.equal(err.stage, 'act')
  assert.equal(err.cause, cause)
  assert.ok(err.message.includes('act'))
  assert.ok(err.message.includes('inner'))
})

test('LlmOperationError extends Error', () => {
  const err = new LlmOperationError('plan', new Error('x'))
  assert.ok(err instanceof Error)
  assert.ok(err instanceof LlmOperationError)
})

test('non-Error thrown in a stage is wrapped in LlmOperationError', async () => {
  const op = makeOp({
    async act(_ctx) {
      throw 'string-throw' // non-Error
    },
  })
  try {
    await runLlmOperation(op, {})
    assert.fail('should have thrown')
  } catch (e) {
    assert.ok(e instanceof LlmOperationError)
    assert.equal(e.stage, 'act')
    assert.ok(e.cause instanceof Error)
    assert.ok(e.cause.message.includes('string-throw'))
  }
})
