import * as fs from 'fs/promises'
import * as path from 'path'
import type { AppPreset, AppPresetId, ScaffoldContext } from './create-app-presets.js'
import { getPresetById, npmPackageNameFromAppName } from './create-app-presets.js'

export type CreateAppOptions = {
  appName: string
  preset: AppPreset
}

/**
 * Writes all scaffold files for the chosen preset under `appDir` (created if missing).
 */
export async function writeScaffoldedApp(appDir: string, options: CreateAppOptions): Promise<void> {
  const ctx: ScaffoldContext = {
    appName: options.appName,
    packageName: npmPackageNameFromAppName(options.appName),
  }
  const files = options.preset.buildFiles(ctx)
  await fs.mkdir(appDir, { recursive: true })
  for (const f of files) {
    const target = path.join(appDir, f.relativePath)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, f.content, 'utf-8')
  }
}

export { getPresetById, npmPackageNameFromAppName }
export type { AppPresetId }
