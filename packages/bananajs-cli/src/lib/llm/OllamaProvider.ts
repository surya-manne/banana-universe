import type { LlmGenerateOptions, LlmProvider } from './LlmProvider.js'
import type { BananarcConfig } from './bananarc.js'
import { fetchWithTimeout, llmSettings, withRetries, LlmHttpError } from './fetch-with-retry.js'

export class OllamaProvider implements LlmProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly defaultModel: string,
    private readonly config: BananarcConfig,
  ) {}

  async generate(prompt: string, options?: LlmGenerateOptions): Promise<string> {
    const { retries, timeoutMs } = llmSettings(this.config)
    const model = options?.model ?? this.defaultModel
    const url = `${this.baseUrl.replace(/\/$/, '')}/api/generate`
    const body = {
      model,
      prompt: options?.system ? `${options.system}\n\n${prompt}` : prompt,
      stream: false,
      options:
        options?.temperature !== undefined ? { temperature: options.temperature } : undefined,
    }

    return withRetries(
      async () => {
        try {
          const res = await fetchWithTimeout(
            url,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            },
            timeoutMs,
          )
          if (!res.ok) {
            const t = await res.text()
            throw new LlmHttpError(`Ollama HTTP ${res.status}: ${t}`, 'HTTP')
          }
          const json = (await res.json()) as { response?: string }
          if (typeof json.response !== 'string') {
            throw new LlmHttpError('Ollama returned an unexpected response shape', 'HTTP')
          }
          return json.response
        } catch (e) {
          if (e instanceof LlmHttpError && e.code === 'NETWORK') {
            const m = e.message
            if (m.includes('ECONNREFUSED') || m.includes('fetch failed')) {
              throw new LlmHttpError(
                'Ollama is not running. Start it with: ollama serve',
                'NETWORK',
              )
            }
          }
          throw e
        }
      },
      retries,
      1000,
    )
  }
}
