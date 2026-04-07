/**
 * Shared LlmProvider contract for @banana-universe packages.
 *
 * Consumed by:
 *   - @banana-universe/bananajs-cli  (generates text via CLI commands)
 *   - @banana-universe/plugin-ai     (registers provider on tsyringe root container)
 *
 * Implementations must remain pure: no side effects, no imports from bananajs core.
 */

export interface LlmGenerateOptions {
  model?: string
  temperature?: number
  system?: string
}

/**
 * Minimal LLM provider contract.
 * Implement this interface to add a new provider (OpenAI, Ollama, Anthropic, etc.).
 */
export interface LlmProvider {
  generate(prompt: string, options?: LlmGenerateOptions): Promise<string>
}

/** tsyringe injection token for the LlmProvider. */
export const AI_PROVIDER_TOKEN = 'AiProvider' as const
