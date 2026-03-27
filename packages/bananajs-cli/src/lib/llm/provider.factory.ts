import type { BananarcConfig } from './bananarc.js'
import type { LlmProvider } from './LlmProvider.js'
import { OllamaProvider } from './OllamaProvider.js'
import { LlamaCppProvider } from './LlamaCppProvider.js'
import { VercelAiProvider } from './VercelAiProvider.js'

export function resolveLlmProvider(config: BananarcConfig): LlmProvider {
  const provider = config.llm?.provider ?? 'ollama'
  const model = config.llm?.model ?? 'llama3.2'

  switch (provider) {
    case 'ollama':
      return new OllamaProvider(config.llm?.baseUrl ?? 'http://localhost:11434', model, config)
    case 'llamacpp':
      return new LlamaCppProvider(config.llm?.baseUrl ?? 'http://127.0.0.1:8080', config)
    case 'openai':
      return new VercelAiProvider('openai', model)
    case 'anthropic':
      return new VercelAiProvider('anthropic', model)
    default:
      return new OllamaProvider('http://localhost:11434', model, config)
  }
}
