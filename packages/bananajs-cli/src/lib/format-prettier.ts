import { execFile } from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/** Walk up from startDir to find workspace `node_modules/prettier`. */
async function findPrettierBin(startDir: string): Promise<string | null> {
  let dir = path.resolve(startDir)
  for (;;) {
    // Try multiple Prettier binary locations: 3.x (.cjs), 3.x alt (.js), 2.x
    const candidates = [
      path.join(dir, 'node_modules', 'prettier', 'bin', 'prettier.cjs'),
      path.join(dir, 'node_modules', 'prettier', 'bin', 'prettier.js'),
      path.join(dir, 'node_modules', 'prettier', 'bin-prettier.js'),
    ]
    for (const candidate of candidates) {
      try {
        await fs.access(candidate)
        return candidate
      } catch {
        /* continue */
      }
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

/**
 * Format a single file with Prettier if it is installed (any ancestor of `searchStartDir`).
 * No-op when Prettier is not found; returns whether formatting ran.
 */
export async function tryFormatFileWithPrettier(
  fileAbsPath: string,
  searchStartDir: string,
): Promise<boolean> {
  const bin = await findPrettierBin(searchStartDir)
  if (!bin) return false
  try {
    await execFileAsync(process.execPath, [bin, '--write', fileAbsPath], {
      cwd: path.dirname(fileAbsPath),
      env: process.env,
    })
    return true
  } catch {
    return false
  }
}
