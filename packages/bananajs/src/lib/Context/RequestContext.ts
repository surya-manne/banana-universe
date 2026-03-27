import { AsyncLocalStorage } from 'async_hooks'
import type { RequestHandler } from 'express'
import { v4 as uuidv4 } from 'uuid'

export interface RequestContextData {
  requestId: string
  userId?: string
  [key: string]: unknown
}

const storage = new AsyncLocalStorage<RequestContextData>()

export const RequestContext = {
  run<T>(data: RequestContextData, fn: () => T): T {
    return storage.run(data, fn)
  },
  get(): RequestContextData | undefined {
    return storage.getStore()
  },
  getRequestId(): string | undefined {
    return storage.getStore()?.requestId
  },
  set(key: string, value: unknown): void {
    const store = storage.getStore()
    if (store) {
      store[key] = value
    }
  },
}

export const requestContextMiddleware: RequestHandler = (req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) ?? uuidv4()
  res.setHeader('X-Request-ID', requestId)
  RequestContext.run({ requestId }, () => next())
}
