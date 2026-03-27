export interface CacheStore {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown, ttl?: number): Promise<void>
  del(key: string): Promise<void>
  keys(pattern: string): Promise<string[]>
}

interface CacheEntry {
  value: unknown
  expiresAt: number // Date.now() + ttl * 1000; 0 = never expires
}

class MemoryCacheStore implements CacheStore {
  private readonly store = new Map<string, CacheEntry>()
  private sweepInterval: ReturnType<typeof setInterval> | undefined

  constructor() {
    this.sweepInterval = setInterval(() => {
      this.sweep()
    }, 60_000)
    // unref so it doesn't block process exit
    if (this.sweepInterval.unref) {
      this.sweepInterval.unref()
    }
  }

  async get(key: string): Promise<unknown> {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  async set(key: string, value: unknown, ttl = 60): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttl > 0 ? Date.now() + ttl * 1000 : 0,
    })
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(
      '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$',
    )
    return [...this.store.keys()].filter((k) => regex.test(k))
  }

  private sweep(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt > 0 && now > entry.expiresAt) {
        this.store.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval)
      this.sweepInterval = undefined
    }
  }
}

export class CacheManager {
  private static instance: CacheManager | undefined
  private readonly store: CacheStore

  private constructor(store: CacheStore) {
    this.store = store
  }

  static getInstance(store?: CacheStore): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(store ?? new MemoryCacheStore())
    }
    return CacheManager.instance
  }

  // For testing — resets the singleton
  static reset(): void {
    CacheManager.instance = undefined
  }

  async get(key: string): Promise<unknown> {
    return this.store.get(key)
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    return this.store.set(key, value, ttl)
  }

  async del(key: string): Promise<void> {
    return this.store.del(key)
  }

  async evict(pattern: string): Promise<void> {
    const matching = await this.store.keys(pattern)
    await Promise.all(matching.map((k) => this.store.del(k)))
  }
}
