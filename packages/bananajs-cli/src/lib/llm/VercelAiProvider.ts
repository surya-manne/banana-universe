import type { LlmGenerateOptions, LlmProvider } from './LlmProvider.js'
import type { LlmProviderKind } from './bananarc.js'

type CloudKind = Extract<LlmProviderKind, 'openai' | 'anthropic' | 'gemini' | 'mistral' | 'groq'>

type GenerateTextFn = (args: {
  model: unknown
  system?: string
  prompt: string
}) => Promise<{ text: string }>

export class VercelAiProvider implements LlmProvider {
  constructor(private readonly kind: CloudKind, private readonly modelId: string) {}

  async generate(prompt: string, options?: LlmGenerateOptions): Promise<string> {
    const aiModule = await import('ai').catch(() => null)
    if (!aiModule) {
      throw new Error('Install the Vercel AI SDK: npm install ai')
    }

    const generateText = aiModule.generateText as GenerateTextFn

    if (this.kind === 'openai') {
      const openaiMod = await import('@ai-sdk/openai').catch(() => null)
      if (!openaiMod) {
        throw new Error('Install OpenAI provider: npm install @ai-sdk/openai')
      }
      if (!process.env['OPENAI_API_KEY']) {
        throw new Error(
          'OPENAI_API_KEY is not set. Export it in your shell or add it to a .env file in your project root.',
        )
      }
      const model = openaiMod.openai(options?.model ?? this.modelId)
      const result = await generateText({ model, system: options?.system, prompt })
      return result.text
    }

    if (this.kind === 'anthropic') {
      const anthropicMod = await import('@ai-sdk/anthropic').catch(() => null)
      if (!anthropicMod) {
        throw new Error('Install Anthropic provider: npm install @ai-sdk/anthropic')
      }
      if (!process.env['ANTHROPIC_API_KEY']) {
        throw new Error(
          'ANTHROPIC_API_KEY is not set. Export it in your shell or add it to a .env file in your project root.',
        )
      }
      const model = anthropicMod.anthropic(options?.model ?? this.modelId)
      const result = await generateText({ model, system: options?.system, prompt })
      return result.text
    }

    if (this.kind === 'gemini') {
      const googleMod = await import('@ai-sdk/google').catch(() => null)
      if (!googleMod) {
        throw new Error('Install Google provider: npm install @ai-sdk/google')
      }
      if (!process.env['GOOGLE_GENERATIVE_AI_API_KEY']) {
        throw new Error(
          'GOOGLE_GENERATIVE_AI_API_KEY is not set. Export it in your shell or add it to a .env file in your project root.',
        )
      }
      const model = googleMod.google(options?.model ?? this.modelId)
      const result = await generateText({ model, system: options?.system, prompt })
      return result.text
    }

    if (this.kind === 'mistral') {
      const mistralMod = await import('@ai-sdk/mistral').catch(() => null)
      if (!mistralMod) {
        throw new Error('Install Mistral provider: npm install @ai-sdk/mistral')
      }
      if (!process.env['MISTRAL_API_KEY']) {
        throw new Error(
          'MISTRAL_API_KEY is not set. Export it in your shell or add it to a .env file in your project root.',
        )
      }
      const model = mistralMod.mistral(options?.model ?? this.modelId)
      const result = await generateText({ model, system: options?.system, prompt })
      return result.text
    }

    // groq
    const groqMod = await import('@ai-sdk/groq').catch(() => null)
    if (!groqMod) {
      throw new Error('Install Groq provider: npm install @ai-sdk/groq')
    }
    if (!process.env['GROQ_API_KEY']) {
      throw new Error(
        'GROQ_API_KEY is not set. Export it in your shell or add it to a .env file in your project root.',
      )
    }
    const model = groqMod.groq(options?.model ?? this.modelId)
    const result = await generateText({ model, system: options?.system, prompt })
    return result.text
  }
}
