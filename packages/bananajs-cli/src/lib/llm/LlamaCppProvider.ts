import type { LlmGenerateOptions, LlmProvider } from './LlmProvider.js'
import type { BananarcConfig } from './bananarc.js'
import { fetchWithTimeout, llmSettings, withRetries, LlmHttpError } from './fetch-with-retry.js'

/** llama.cpp server compatible `/completion` endpoint (default port 8080). */
export class LlamaCppProvider implements LlmProvider {
  constructor(private readonly baseUrl: string, private readonly config: BananarcConfig) {}

  async generate(prompt: string, options?: LlmGenerateOptions): Promise<string> {
    const { retries, timeoutMs } = llmSettings(this.config)
    const fullPrompt = options?.system ? `${options.system}\n\n${prompt}` : prompt
    const url = `${this.baseUrl.replace(/\/$/, '')}/completion`

    return withRetries(
      async () => {
        const res = await fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: fullPrompt,
              n_predict: 4096,
              temperature: options?.temperature,
            }),
          },
          timeoutMs,
        )
        if (!res.ok) {
          const t = await res.text()
          throw new LlmHttpError(`llama.cpp server HTTP ${res.status}: ${t}`, 'HTTP')
        }
        const json = (await res.json()) as { content?: string; completion?: string[] }
        const text =
          typeof json.content === 'string'
            ? json.content
            : Array.isArray(json.completion)
            ? json.completion.join('')
            : ''
        if (!text) {
          throw new LlmHttpError('llama.cpp server returned empty content', 'HTTP')
        }
        return text
      },
      retries,
      1000,
    )
  }
}
