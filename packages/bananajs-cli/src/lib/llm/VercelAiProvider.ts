import type { LlmGenerateOptions, LlmProvider } from './LlmProvider.js'
import type { LlmProviderKind } from './bananarc.js'

type CloudKind = Extract<LlmProviderKind, 'openai' | 'anthropic'>

export class VercelAiProvider implements LlmProvider {
  constructor(private readonly kind: CloudKind, private readonly modelId: string) {}

  async generate(prompt: string, options?: LlmGenerateOptions): Promise<string> {
    const aiModule = await import('ai').catch(() => null)
    if (!aiModule) {
      throw new Error('Install the Vercel AI SDK: npm install ai')
    }

    let generateText = aiModule.generateText as (args: {
      model: unknown
      system?: string
      prompt: string
    }) => Promise<{ text: string }>

    if (this.kind === 'openai') {
      const openaiMod = await import('@ai-sdk/openai').catch(() => null)
      if (!openaiMod) {
        throw new Error('Install OpenAI provider: npm install @ai-sdk/openai')
      }
      if (!process.env['OPENAI_API_KEY']) {
        throw new Error('Set OPENAI_API_KEY for OpenAI cloud generation.')
      }
      const model = openaiMod.openai(options?.model ?? this.modelId)
      const result = await generateText({
        model,
        system: options?.system,
        prompt,
      })
      return result.text
    }

    const anthropicMod = await import('@ai-sdk/anthropic').catch(() => null)
    if (!anthropicMod) {
      throw new Error('Install Anthropic provider: npm install @ai-sdk/anthropic')
    }
    if (!process.env['ANTHROPIC_API_KEY']) {
      throw new Error('Set ANTHROPIC_API_KEY for Anthropic cloud generation.')
    }
    const model = anthropicMod.anthropic(options?.model ?? this.modelId)
    const result = await generateText({
      model,
      system: options?.system,
      prompt,
    })
    return result.text
  }
}
