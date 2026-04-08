/**
 * PRPAV LLM operation pipeline — shared contract for bananajs-cli.
 *
 * Every LLM-backed command implements LlmOperation<TOptions, TCtx, TOutput> and
 * runs via runLlmOperation(). The five stages execute sequentially:
 *
 *   Prepare  — validate opts, load bananarc, resolve provider, populate base ctx
 *   Research — gather codebase/filesystem artifacts (source files, git log, …)
 *   Plan     — construct prompts; decide batching / call count
 *   Act      — execute LLM call(s); store raw responses in ctx
 *   Validate — parse / Zod-validate output; return typed TOutput or throw
 *
 * Act is skipped when isProviderOptional === true && ctx.providerAvailable === false.
 * All stage errors are wrapped with LlmOperationError carrying the originating stage name.
 */

// ─── Pipeline stage ───────────────────────────────────────────────────────────

export type PipelineStage = 'prepare' | 'research' | 'plan' | 'act' | 'validate'

// ─── Typed error ──────────────────────────────────────────────────────────────

/**
 * Wraps any stage-level failure with the originating stage name.
 * Callers can distinguish pipeline stage failures from business-logic errors.
 */
export class LlmOperationError extends Error {
  constructor(
    public readonly stage: PipelineStage,
    // eslint-disable-next-line @typescript-eslint/no-shadow
    public override readonly cause: Error,
  ) {
    super(`[${stage}] ${cause.message}`)
    this.name = 'LlmOperationError'
    if (cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`
    }
  }
}

// ─── Base context ─────────────────────────────────────────────────────────────

/**
 * Minimal fields every operation context must carry.
 * Operations extend this interface with their own stage-specific state.
 *
 * Design:
 * - provider is resolved in prepare() and stored here for use in act()
 * - providerAvailable === false causes act() to be skipped when isProviderOptional is true
 * - debug is forwarded from the caller options so stages can emit verbose output
 */
export interface BaseCtx {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider: any | null
  providerAvailable: boolean
  debug: boolean
}

// ─── Operation contract ───────────────────────────────────────────────────────

/**
 * Contract for a single LLM operation following the PRPAV pipeline.
 *
 * TOptions — public options type passed in by callers
 * TCtx     — internal mutable context (must extend BaseCtx) flowing through all stages
 * TOutput  — final typed output returned from validate()
 *
 * Design notes:
 * - provider is resolved in prepare() and stored as ctx.provider
 * - isProviderOptional: when true, act() is skipped if ctx.providerAvailable === false;
 *   research and validate still run so static-only results can be delivered
 * - Multi-call operations (e.g. ai-module) chain all LLM calls inside act(); act() may
 *   also perform inline HITL prompts when running in a TTY context
 * - The public exported function (runAiXxx) wraps runLlmOperation and handles
 *   process lifecycle concerns (process.exit, error printing) that pipelines must not do
 */
export interface LlmOperation<TOptions, TCtx extends BaseCtx, TOutput> {
  /** Human-readable name for debug output and error messages. */
  name: string

  /**
   * When true, act() is skipped if ctx.providerAvailable === false.
   * Useful for operations where LLM enrichment is fully optional (e.g. ai-wire).
   */
  isProviderOptional?: boolean

  /** Validate options; load bananarc; resolve provider; return populated ctx. */
  prepare(opts: TOptions): Promise<TCtx>

  /** Gather codebase/filesystem artifacts: source files, git log, module tree, etc. */
  research(ctx: TCtx): Promise<TCtx>

  /** Construct prompts; determine call count and batching strategy. */
  plan(ctx: TCtx): Promise<TCtx>

  /**
   * Execute LLM call(s); store raw responses in ctx.
   * Skipped when isProviderOptional === true && ctx.providerAvailable === false.
   * Multi-step operations (e.g. ai-module) chain their LLM calls internally here.
   */
  act(ctx: TCtx): Promise<TCtx>

  /** Parse / Zod-validate LLM output; return typed TOutput or throw on schema violation. */
  validate(ctx: TCtx): Promise<TOutput>
}

// ─── Runner ───────────────────────────────────────────────────────────────────

/**
 * Executes a 5-stage PRPAV pipeline for an LLM operation.
 *
 * @param operation - The LlmOperation implementation
 * @param opts      - Caller-provided options, passed to prepare()
 * @param debug     - When true, prints stage transitions and timing to stderr
 * @returns The typed output from validate()
 * @throws LlmOperationError on any stage failure, with the stage name set
 */
export async function runLlmOperation<TOptions, TCtx extends BaseCtx, TOutput>(
  operation: LlmOperation<TOptions, TCtx, TOutput>,
  opts: TOptions,
  debug?: boolean,
): Promise<TOutput> {
  const log = (msg: string): void => {
    if (debug) process.stderr.write(`[pipeline:${operation.name}] ${msg}\n`)
  }

  const wrap = <T>(stage: PipelineStage, fn: () => Promise<T>): Promise<T> => {
    log(`▶ ${stage}`)
    const t0 = Date.now()
    return fn()
      .then((r) => {
        log(`✔ ${stage} (${Date.now() - t0}ms)`)
        return r
      })
      .catch((e: unknown) => {
        const err = e instanceof Error ? e : new Error(String(e))
        throw new LlmOperationError(stage, err)
      })
  }

  let ctx = await wrap('prepare', () => operation.prepare(opts))
  ctx = await wrap('research', () => operation.research(ctx))
  ctx = await wrap('plan', () => operation.plan(ctx))

  const skipAct = operation.isProviderOptional === true && !ctx.providerAvailable
  if (skipAct) {
    log('○ act skipped (providerAvailable=false)')
  } else {
    ctx = await wrap('act', () => operation.act(ctx))
  }

  return await wrap('validate', () => operation.validate(ctx))
}
