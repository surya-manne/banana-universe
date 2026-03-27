/**
 * Normalizes a route segment: trims leading/trailing slashes. Empty input becomes ''.
 */
export function normalizeRouteToken(raw: string): string {
  return raw.replace(/^\/+|\/+$/g, '')
}

/**
 * Joins route tokens into a single Express path with a leading slash.
 * Empty segments are skipped. No segment should include leading/trailing slashes (use normalizeRouteToken).
 */
export function joinRouteSegments(...segments: string[]): string {
  const parts = segments.map(normalizeRouteToken).filter(Boolean)
  if (parts.length === 0) {
    return '/'
  }
  return `/${parts.join('/')}`
}
