import request from 'supertest'
import type { Response as SupertestResponse } from 'supertest'
import { BananaApp } from '../lib/Core/App'
import type { BananaAppOptions, Constructor } from '../lib/Core/App'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface InjectConfig {
  method: HttpMethod
  url: string
  body?: Record<string, unknown>
  headers?: Record<string, string>
}

export class BananaTestApp {
  private readonly app: BananaApp
  private persistentHeaders: Record<string, string> = {}

  private constructor(app: BananaApp) {
    this.app = app
  }

  static create(controllers: Constructor[], options: BananaAppOptions = {}): BananaTestApp {
    const mergedOptions: BananaAppOptions = {
      logger: false,
      gracefulShutdown: false,
      rateLimit: false,
      requestId: false,
      ...options,
      security: { helmet: false, cors: false, ...options.security },
    }
    return new BananaTestApp(new BananaApp(controllers, mergedOptions))
  }

  withAuth(token: string): this {
    this.persistentHeaders['Authorization'] = `Bearer ${token}`
    return this
  }

  withHeaders(headers: Record<string, string>): this {
    Object.assign(this.persistentHeaders, headers)
    return this
  }

  clearHeaders(): this {
    this.persistentHeaders = {}
    return this
  }

  get agent(): ReturnType<typeof request> {
    return request(this.app.getInstance())
  }

  async inject(config: InjectConfig): Promise<SupertestResponse> {
    const { method, url, body, headers = {} } = config
    const methodKey = method.toLowerCase() as Lowercase<HttpMethod>
    const req = this.agent[methodKey](url)
    const merged = { ...this.persistentHeaders, ...headers }
    Object.entries(merged).forEach(([key, value]) => req.set(key, value))
    if (body !== undefined) {
      req.send(body)
    }
    return req
  }
}
