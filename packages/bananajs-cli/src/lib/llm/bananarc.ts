import * as fs from 'fs/promises'
import * as path from 'path'

export type LlmProviderKind = 'ollama' | 'llamacpp' | 'openai' | 'anthropic'
export type OrmPreference = 'typeorm' | 'mongoose' | 'none'

export interface BananarcConfig {
  llm?: {
    provider?: LlmProviderKind
    model?: string
    baseUrl?: string
    retries?: number
    timeoutMs?: number
  }
  generate?: {
    defaultOrm?: OrmPreference
    outDir?: string
  }
}

export const BANANARC_FILENAME = '.bananarc.json'

export const DEFAULT_BANANARC: BananarcConfig = {
  llm: {
    provider: 'ollama',
    model: 'llama3.2',
    baseUrl: 'http://localhost:11434',
    retries: 2,
    timeoutMs: 30_000,
  },
  generate: {
    defaultOrm: 'typeorm',
    outDir: './src',
  },
}

export async function loadBananarc(cwd: string): Promise<BananarcConfig> {
  const file = path.join(cwd, BANANARC_FILENAME)
  let raw: string
  try {
    raw = await fs.readFile(file, 'utf-8')
  } catch {
    return mergeBananarc({})
  }
  try {
    const parsed = JSON.parse(raw) as BananarcConfig
    return mergeBananarc(parsed)
  } catch {
    return mergeBananarc({})
  }
}

function mergeBananarc(parsed: BananarcConfig): BananarcConfig {
  const d = DEFAULT_BANANARC
  const llm = { ...d.llm }
  if (parsed.llm) {
    for (const [k, v] of Object.entries(parsed.llm)) {
      if (v !== undefined) (llm as Record<string, unknown>)[k] = v
    }
  }
  const generate = { ...d.generate }
  if (parsed.generate) {
    for (const [k, v] of Object.entries(parsed.generate)) {
      if (v !== undefined) (generate as Record<string, unknown>)[k] = v
    }
  }
  const rawOrm = (generate as { defaultOrm?: string }).defaultOrm
  if (rawOrm === 'prisma') {
    ;(generate as { defaultOrm: OrmPreference }).defaultOrm = 'mongoose'
  }
  return { llm, generate }
}

export async function saveBananarc(cwd: string, config: BananarcConfig): Promise<void> {
  const merged = mergeBananarc(config)
  const file = path.join(cwd, BANANARC_FILENAME)
  await fs.writeFile(file, JSON.stringify(merged, null, 2) + '\n', 'utf-8')
}
