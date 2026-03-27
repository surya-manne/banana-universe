import * as path from 'path'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { fetchWithTimeout } from './llm/fetch-with-retry.js'
import {
  saveBananarc,
  loadBananarc,
  type BananarcConfig,
  type LlmProviderKind,
} from './llm/bananarc.js'

async function probeOllama(baseUrl: string): Promise<boolean> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/tags`
  try {
    const res = await fetchWithTimeout(url, { method: 'GET' }, 5000)
    return res.ok
  } catch {
    return false
  }
}

export async function aiSetup(cwd: string = process.cwd()): Promise<void> {
  const existing = await loadBananarc(cwd)

  const { provider } = await inquirer.prompt<{ provider: LlmProviderKind }>([
    {
      type: 'list',
      name: 'provider',
      message: 'Which LLM provider do you want to use?',
      choices: [
        { name: 'Ollama (recommended, offline, no API keys)', value: 'ollama' },
        { name: 'llama.cpp HTTP server', value: 'llamacpp' },
        { name: 'OpenAI (cloud)', value: 'openai' },
        { name: 'Anthropic (cloud)', value: 'anthropic' },
      ],
      default: existing.llm?.provider ?? 'ollama',
    },
  ])

  let baseUrl = existing.llm?.baseUrl
  let model = existing.llm?.model

  if (provider === 'ollama') {
    const ans = await inquirer.prompt<{ baseUrl: string; model: string }>([
      {
        type: 'input',
        name: 'baseUrl',
        message: 'Ollama base URL',
        default: baseUrl ?? 'http://localhost:11434',
      },
      {
        type: 'input',
        name: 'model',
        message: 'Default model name',
        default: model ?? 'llama3.2',
      },
    ])
    baseUrl = ans.baseUrl
    model = ans.model

    const ok = await probeOllama(baseUrl)
    if (!ok) {
      console.log(
        chalk.yellow(
          'Could not reach Ollama at ' +
            baseUrl +
            '. Install from https://ollama.com and run `ollama serve`, then `ollama pull ' +
            model +
            '`.',
        ),
      )
      const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Save .bananarc.json anyway?',
          default: true,
        },
      ])
      if (!proceed) {
        console.log(chalk.gray('Aborted.'))
        return
      }
    } else {
      console.log(chalk.green('Ollama is reachable.'))
    }
  } else if (provider === 'llamacpp') {
    const ans = await inquirer.prompt<{ baseUrl: string }>([
      {
        type: 'input',
        name: 'baseUrl',
        message: 'llama.cpp server base URL',
        default: baseUrl ?? 'http://127.0.0.1:8080',
      },
    ])
    baseUrl = ans.baseUrl
    model = model ?? 'default'
  } else if (provider === 'openai') {
    const ans = await inquirer.prompt<{ model: string }>([
      {
        type: 'input',
        name: 'model',
        message: 'OpenAI model id',
        default: model ?? 'gpt-4o-mini',
      },
    ])
    model = ans.model
    baseUrl = undefined
    if (!process.env['OPENAI_API_KEY']) {
      console.log(chalk.yellow('Set OPENAI_API_KEY in your environment for cloud generation.'))
    }
  } else {
    const ans = await inquirer.prompt<{ model: string }>([
      {
        type: 'input',
        name: 'model',
        message: 'Anthropic model id',
        default: model ?? 'claude-3-5-sonnet-20241022',
      },
    ])
    model = ans.model
    baseUrl = undefined
    if (!process.env['ANTHROPIC_API_KEY']) {
      console.log(chalk.yellow('Set ANTHROPIC_API_KEY in your environment for cloud generation.'))
    }
  }

  const next: BananarcConfig = {
    llm: {
      provider,
      model,
      baseUrl,
      retries: existing.llm?.retries,
      timeoutMs: existing.llm?.timeoutMs,
    },
    generate: existing.generate,
  }

  await saveBananarc(cwd, next)
  console.log(chalk.green(`Wrote ${path.join(cwd, '.bananarc.json')}`))
}
