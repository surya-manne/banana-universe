import type { LlmProvider } from '@banana-universe/ai-provider-core'
import { AI_PROVIDER_TOKEN } from '@banana-universe/ai-provider-core'
import type { BananaPlugin, AppContext } from '@banana-universe/bananajs'

export type { LlmProvider, LlmGenerateOptions } from '@banana-universe/ai-provider-core'
export { AI_PROVIDER_TOKEN } from '@banana-universe/ai-provider-core'

/** Options accepted by {@link BananaAiPlugin}. */
export interface BananaAiPluginOptions {
  /**
   * A ready-to-use LlmProvider instance.
   *
   * Obtain one from `@banana-universe/bananajs-cli` (OllamaProvider, VercelAiProvider, etc.)
   * or supply your own implementation of the {@link LlmProvider} interface.
   */
  provider: LlmProvider
}

/**
 * BananaAiPlugin — registers the given {@link LlmProvider} on the tsyringe root container
 * under the {@link AI_PROVIDER_TOKEN} (`"AiProvider"`) injection token.
 *
 * Controllers and services can then receive the provider via `@inject(AI_PROVIDER_TOKEN)`.
 *
 * @example
 * ```typescript
 * import { BananaApp } from '@banana-universe/bananajs'
 * import { BananaAiPlugin } from '@banana-universe/plugin-ai'
 * import { OllamaProvider } from '@banana-universe/bananajs-cli/llm' // or your own impl
 *
 * await BananaApp.create({
 *   plugins: [BananaAiPlugin({ provider: new OllamaProvider('http://localhost:11434') })],
 *   modules: [catalogModule],
 * })
 * ```
 *
 * ## Security — prompt injection
 *
 * **This plugin does NOT sanitize user input before LLM calls.**
 * Handlers that pass user-controlled request data directly to `this.ai.generate()` are
 * exposed to prompt injection attacks.
 *
 * Teams MUST:
 * - Validate and truncate user input via `@Body` Zod schema before any LLM call.
 * - Never include raw `req.headers` or `req.params` in system prompts.
 * - Prefer structured prompt templates over open string interpolation.
 * - Treat LLM outputs as untrusted before rendering in HTTP responses.
 */
export function BananaAiPlugin(options: BananaAiPluginOptions): BananaPlugin {
  return {
    name: 'BananaAiPlugin',

    register(ctx: AppContext): void {
      if (!ctx.container) {
        throw new Error(
          'BananaAiPlugin requires a tsyringe DI container. ' +
            'Use BananaApp.create({ modules: [...] }) or pass an explicit container.',
        )
      }

      ctx.container.registerInstance<LlmProvider>(AI_PROVIDER_TOKEN, options.provider)

      ctx.logger?.info(`[BananaAiPlugin] LlmProvider registered under token "${AI_PROVIDER_TOKEN}"`)
    },

    onShutdown(): void {
      // No-op: stateless provider references are GC'd naturally.
      // Providers that hold connections (e.g. persistent gRPC) should implement their own cleanup
      // and expose it; override this plugin if needed.
    },
  }
}
