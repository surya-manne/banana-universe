import pino from 'pino'
import type { Logger } from './Logger.interface'

export class PinoLogger implements Logger {
  private readonly _logger: pino.Logger

  constructor(options?: pino.LoggerOptions) {
    this._logger = pino({
      level: process.env['LOG_LEVEL'] ?? 'info',
      ...options,
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
