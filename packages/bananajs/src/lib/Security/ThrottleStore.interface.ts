/**
 * Contract for a distributed throttle store used by `@Throttle`.
 *
 * Implement this interface against any backend (Redis, Memcached, database, etc.)
 * and pass it as `store` in `ThrottleOptions` to enable multi-instance rate limiting.
 *
 * @example
 * ```typescript
 * const redisStore: ThrottleStore = {
 *   async consume(key) {
 *     // increment counter in Redis; throw if limit exceeded
 *   },
 *   async reset(key) {
 *     // delete counter key in Redis
 *   },
 * }
 *
 * @Throttle({ windowMs: 60_000, max: 10, store: redisStore })
 * ```
 */
export interface ThrottleStore {
  /**
   * Record one request for the given key.
   * Implementations MUST throw (or reject) when the limit is exceeded so the
   * framework can return 429 Too Many Requests.
   */
  consume(key: string): Promise<void>

  /**
   * Reset the counter for the given key (e.g. when the window expires or for testing).
   */
  reset(key: string): Promise<void>
}
