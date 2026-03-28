import type { OrmChoice } from './generate-module.js'

/** Same ids as `ban new --preset` — maps to layered module ORM output. */
export function presetIdToOrm(presetId: string): OrmChoice | undefined {
  const id = presetId.trim().toLowerCase()
  if (id === 'mongodb') return 'mongoose'
  if (id === 'sql') return 'typeorm'
  return undefined
}

export const PRESET_ORM_HELP = 'mongodb | sql (same as ban new --preset)'
