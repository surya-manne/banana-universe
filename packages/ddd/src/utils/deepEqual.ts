/** Structural equality for plain objects and arrays (ValueObject). */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((v, i) => deepEqual(v, b[i]))
  }
  if (Array.isArray(a) || Array.isArray(b)) return false
  const ak = Object.keys(a as object).sort()
  const bk = Object.keys(b as object).sort()
  if (ak.length !== bk.length) return false
  for (let i = 0; i < ak.length; i++) {
    if (ak[i] !== bk[i]) return false
  }
  const ao = a as Record<string, unknown>
  const bo = b as Record<string, unknown>
  for (const k of ak) {
    if (!deepEqual(ao[k], bo[k])) return false
  }
  return true
}
