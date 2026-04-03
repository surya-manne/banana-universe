import * as fs from 'fs/promises'
import * as path from 'path'
import { presetIdToOrm } from '../preset-orm.js'

export type LlmProviderKind = 'ollama' | 'llamacpp' | 'openai' | 'anthropic' | 'gemini' | 'mistral' | 'groq'

/** Default model ID per provider — used by setup wizard and mergeBananarc fallback. */
export const PROVIDER_DEFAULT_MODELS: Record<LlmProviderKind, string> = {
  ollama: 'llama3.2',
  llamacpp: 'default',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-sonnet-20241022',
  gemini: 'gemini-2.0-flash',
  mistral: 'mistral-large-latest',
  groq: 'llama-3.3-70b-versatile',
}
export type OrmPreference = 'typeorm' | 'mongoose' | 'none'

/** Optional project context for codegen, wire hints, and AI rubrics (minimal schema; extend with care). */
export interface BananarcProjectContext {
  /** Layout contract for generated modules (e.g. \`1\` = current enterprise layout). */
  moduleLayoutVersion?: string
  /** Default URI prefix when documenting or suggesting routes (e.g. \`/api/v1\`). */
  apiPrefix?: string
  /** Path to bootstrap relative to project root (default: \`src/bootstrap.ts\`). */
  bootstrap?: string
  /** Entry file relative to project root (default: \`src/main.ts\`). */
  main?: string
}

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
    /** Same as `ban new --preset`: sets default ORM when `defaultOrm` is omitted (`mongodb` → mongoose, `sql` → typeorm). */
    preset?: 'mongodb' | 'sql'
    outDir?: string
  }
  /** Project layout and bootstrap hints for AI / wire commands. */
  project?: BananarcProjectContext
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
  project: {
    moduleLayoutVersion: '1',
    bootstrap: 'src/bootstrap.ts',
    main: 'src/main.ts',
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

export function mergeBananarc(parsed: BananarcConfig): BananarcConfig {
  const d = DEFAULT_BANANARC
  const llm = { ...d.llm }
  if (parsed.llm) {
    for (const [k, v] of Object.entries(parsed.llm)) {
      if (v !== undefined) (llm as Record<string, unknown>)[k] = v
    }
  }
  // Provider-aware model fallback: if no model was explicitly set, use the correct default for the provider
  const resolvedProvider = (llm as { provider?: LlmProviderKind }).provider
  if (resolvedProvider && resolvedProvider !== 'ollama' && !(parsed.llm?.model)) {
    ;(llm as Record<string, unknown>)['model'] = PROVIDER_DEFAULT_MODELS[resolvedProvider]
  }
  const generate = { ...d.generate }
  if (parsed.generate) {
    for (const [k, v] of Object.entries(parsed.generate)) {
      if (v !== undefined) (generate as Record<string, unknown>)[k] = v
    }
  }
  if (parsed.generate?.preset !== undefined && parsed.generate.defaultOrm === undefined) {
    const mapped = presetIdToOrm(String(parsed.generate.preset))
    if (mapped) (generate as { defaultOrm: OrmPreference }).defaultOrm = mapped as OrmPreference
  }
  const rawOrm = (generate as { defaultOrm?: string }).defaultOrm
  if (rawOrm === 'prisma') {
    ;(generate as { defaultOrm: OrmPreference }).defaultOrm = 'mongoose'
  }
  const project = { ...d.project, ...parsed.project }
  return { llm, generate, project }
}

export async function saveBananarc(cwd: string, config: BananarcConfig): Promise<void> {
  const merged = mergeBananarc(config)
  const file = path.join(cwd, BANANARC_FILENAME)
  await fs.writeFile(file, JSON.stringify(merged, null, 2) + '\n', 'utf-8')
}
