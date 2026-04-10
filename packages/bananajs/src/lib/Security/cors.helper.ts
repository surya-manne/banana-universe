import type { CorsOptions } from 'cors'

/**
 * Creates a strict CORS configuration object from an explicit origin allowlist.
 *
 * Passing a wildcard origin (`'*'`) in `allowedOrigins` is intentionally
 * discouraged — use `security.cors` directly for open APIs.
 *
 * @example
 * ```typescript
 * new BananaApp({
 *   controllers: [...],
 *   security: {
 *     cors: createCorsOptions(['https://app.example.com', 'https://admin.example.com']),
 *   },
 * })
 * ```
 */
export function createCorsOptions(allowedOrigins: string[]): CorsOptions {
  return {
    origin: allowedOrigins,
    credentials: true,
  }
}
