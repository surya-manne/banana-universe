import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createBananaAppEslintConfig } from '../../eslint.app.config.mjs'

const appRoot = dirname(fileURLToPath(import.meta.url))
export default createBananaAppEslintConfig(appRoot)
