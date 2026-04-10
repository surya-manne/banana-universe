import pino, { type redactOptions } from 'pino'
import type { Logger } from './Logger.interface'

const DEFAULT_REDACT_PATHS = [
  'password',
  'token',
  'authorization',
  'cookie',
  '*.secret',
  '*.apiKey',
  '*.api_key',
  '*.accessToken',
  '*.access_token',
]

export class PinoLogger implements Logger {
  private readonly _logger: pino.Logger

  constructor(options?: pino.LoggerOptions) {
    const callerRedact = options?.redact
    const redactPaths =
      Array.isArray(callerRedact)
        ? [...new Set([...DEFAULT_REDACT_PATHS, ...callerRedact])]
        : typeof callerRedact === 'object' && callerRedact !== null && 'paths' in callerRedact
          ? { ...callerRedact, paths: [...new Set([...DEFAULT_REDACT_PATHS, ...(callerRedact as redactOptions).paths])] }
          : { paths: DEFAULT_REDACT_PATHS, censor: '[REDACTED]' }
    this._logger = pino({
      level: process.env['LOG_LEVEL'] ?? 'info',
      ...options,
      redact: redactPaths,
    })
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this._logger.info(meta ?? {}, message)
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this._logger.warn(meta ?? {}, message)
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this._logger.error(meta ?? {}, message)
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this._logger.debug(meta ?? {}, message)
  }
}
