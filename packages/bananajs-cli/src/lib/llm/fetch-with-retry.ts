import type { BananarcConfig } from './bananarc.js'

export class LlmHttpError extends Error {
  constructor(message: string, readonly code: 'TIMEOUT' | 'NETWORK' | 'HTTP' | 'OLLAMA_DOWN') {
    super(message)
    this.name = 'LlmHttpError'
  }
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const merged = { ...init, signal: signal ?? controller.signal }
    return await fetch(url, merged)
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new LlmHttpError(
        `LLM request timed out after ${Math.round(
          timeoutMs / 1000,
        )}s. Increase llm.timeoutMs in .bananarc.json`,
        'TIMEOUT',
      )
    }
    const msg = (e as Error).message ?? String(e)
    throw new LlmHttpError(msg, 'NETWORK')
  } finally {
    clearTimeout(t)
  }
}

export async function withRetries<T>(
  fn: () => Promise<T>,
  retries: number,
  backoffMs: number,
): Promise<T> {
  let last: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs))
      }
    }
  }
  throw last
}

export function llmSettings(config: BananarcConfig): { retries: number; timeoutMs: number } {
  return {
    retries: config.llm?.retries ?? 2,
    timeoutMs: config.llm?.timeoutMs ?? 30_000,
  }
}
