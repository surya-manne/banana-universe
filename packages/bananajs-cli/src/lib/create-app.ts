import * as fs from 'fs/promises'
import * as path from 'path'
import type { AppPreset, AppPresetId, ScaffoldContext } from './create-app-presets.js'
import { getPresetById, npmPackageNameFromAppName } from './create-app-presets.js'
import { tryFormatFileWithPrettier } from './format-prettier.js'

export type CreateAppOptions = {
  appName: string
  preset: AppPreset
  structure: 'ddd' | 'flat'
}

const FORMATTABLE_EXTENSIONS = new Set(['.ts', '.mjs', '.js', '.json'])

/**
 * Writes all scaffold files for the chosen preset under `appDir` (created if missing),
 * then formats each eligible file with Prettier if available.
 */
export async function writeScaffoldedApp(appDir: string, options: CreateAppOptions): Promise<void> {
  const ctx: ScaffoldContext = {
    appName: options.appName,
    packageName: npmPackageNameFromAppName(options.appName),
    structure: options.structure,
  }
  const files = options.preset.buildFiles(ctx)
  await fs.mkdir(appDir, { recursive: true })
  for (const f of files) {
    const target = path.join(appDir, f.relativePath)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, f.content, 'utf-8')
    if (FORMATTABLE_EXTENSIONS.has(path.extname(f.relativePath))) {
      await tryFormatFileWithPrettier(target, appDir)
    }
  }
}

export { getPresetById, npmPackageNameFromAppName }
export type { AppPresetId }
