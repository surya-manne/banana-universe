import * as path from 'path'

/**
 * Loads a .env file from `cwd` into process.env without overriding already-set variables.
 * Requires `dotenv` to be installed (optional peer dep). Prints a helpful warning when absent.
 */
export async function loadEnvFile(cwd: string): Promise<void> {
  const envPath = path.join(cwd, '.env')

  const dotenvMod = await import('dotenv').catch(() => null)
  if (!dotenvMod) {
    // Only warn if a .env file actually exists — avoids noise for users who don't use it
    const fs = await import('fs/promises')
    const exists = await fs
      .access(envPath)
      .then(() => true)
      .catch(() => false)
    if (exists) {
      process.stderr.write(
        'dotenv is not installed — .env file was not loaded. Run: npm install dotenv\n',
      )
    }
    return
  }

  dotenvMod.config({ path: envPath, override: false })
}
