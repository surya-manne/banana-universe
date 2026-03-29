import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import { loadBananarc } from './llm/bananarc.js'
import { appendBananaJsAiRules } from './llm/bananajs-ai-rules.js'
import { resolveLlmProvider } from './llm/provider.factory.js'

/** Short module/file summary for humans or PR descriptions (CLI-only; not IDE-specific). */
export async function runAiExplain(fileArg: string | undefined): Promise<void> {
  if (!fileArg) {
    console.error(chalk.red('Specify a file path, e.g. `bananajs ai explain src/modules/foo/index.ts`'))
    process.exit(1)
  }
  const abs = path.resolve(process.cwd(), fileArg)
  let content: string
  try {
    content = await fs.readFile(abs, 'utf-8')
  } catch {
    console.error(chalk.red(`File not found: ${abs}`))
    process.exit(1)
  }

  const config = await loadBananarc(process.cwd())
  const provider = resolveLlmProvider(config)
  const system = appendBananaJsAiRules(
    'Summarize this BananaJS/TypeScript module for a human reader: responsibilities, main exports, and integration points. 5–10 bullet points max. No code fences.',
  )
  try {
    const text = await provider.generate(`File: ${fileArg}\n\n${content}`, {
      system,
      temperature: 0.2,
    })
    console.log(chalk.bold.blue(`\nExplain: ${fileArg}\n`))
    console.log(text)
  } catch (e) {
    console.error(chalk.red('ai explain failed:'), e)
    process.exit(1)
  }
}
