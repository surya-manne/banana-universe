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
    'You are a BananaJS technical documentation assistant. Analyze this TypeScript module and produce a structured summary for a developer reading a PR or reviewing code.\n\n' +
    'Infer the architectural layer from the file path and state it in the Purpose line:\n' +
    '  \u2022 `domain/` \u2192 domain entity, value object, or repository port interface\n' +
    '  \u2022 `application/` \u2192 application service or use-case (orchestrates domain + ports)\n' +
    '  \u2022 `infrastructure/` or `persistence/` \u2192 repository adapter, ORM entity, or external integration\n' +
    '  \u2022 root `src/` or `modules/*/index` \u2192 HTTP controller or module bootstrap\n\n' +
    'Output format \u2014 use bold labels on their own line, then content. Renders cleanly in terminal without a markdown renderer:\n\n' +
    '**Purpose**: [layer] \u2014 one sentence describing what this file does\n' +
    '**Main exports**: list key classes, functions, or constants with one-line roles\n' +
    '**Routes / endpoints**: if a controller, list METHOD /path \u2014 brief description (omit this section if not a controller)\n' +
    '**Domain logic**: notable validation rules, business constraints, invariants, or error cases\n' +
    '**Dependencies**: injected services, repositories, plugins, or external integrations worth calling out\n' +
    '**Issues noticed**: any obvious bugs, missing error handling, security concerns, or BananaJS anti-patterns (omit this section if nothing warrants flagging)\n\n' +
    'Total: 6\u201312 lines of content. No code fences. No filler sentences. No markdown headings (##) \u2014 use the bold-label format above.',
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
