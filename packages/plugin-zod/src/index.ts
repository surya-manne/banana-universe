import 'reflect-metadata'

/**
 * @deprecated Import `@Body`, `@Query`, and `@Params` from `@banana-universe/bananajs` instead.
 * Zod is the default validation path in BananaJS 0.5+.
 */
export { Body as ZodBody, Query as ZodQuery, Params as ZodParams } from '@banana-universe/bananajs'

/** @deprecated No longer required; Zod validation is built into the core framework. */
export function ZodPlugin(): {
  name: string
  register(): void
} {
  return {
    name: 'ZodPlugin',
    register(): void {
      /* no-op */
    },
  }
}
