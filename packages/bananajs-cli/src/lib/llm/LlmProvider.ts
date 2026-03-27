export interface LlmGenerateOptions {
  model?: string
  temperature?: number
  system?: string
}

export interface LlmProvider {
  generate(prompt: string, options?: LlmGenerateOptions): Promise<string>
}
