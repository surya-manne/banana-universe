import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { fetchWithTimeout } from './llm/fetch-with-retry.js'
import {
  saveBananarc,
  loadBananarc,
  PROVIDER_DEFAULT_MODELS,
  type BananarcConfig,
  type LlmProviderKind,
} from './llm/bananarc.js'

/** Required environment variable name per cloud provider */
const CLOUD_API_KEYS: Partial<Record<LlmProviderKind, string>> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GOOGLE_GENERATIVE_AI_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  groq: 'GROQ_API_KEY',
}

async function probeOllama(baseUrl: string): Promise<boolean> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/tags`
  try {
    const res = await fetchWithTimeout(url, { method: 'GET' }, 5000)
    return res.ok
  } catch {
    return false
  }
}

async function writeEnvExample(cwd: string, envKey: string): Promise<void> {
  const examplePath = path.join(cwd, '.env.example')
  const line = `${envKey}=your-api-key-here\n`
  let existing = ''
  try {
    existing = await fs.readFile(examplePath, 'utf-8')
  } catch {
    // file not yet created — will create it
  }
  if (existing.includes(envKey)) {
    console.log(chalk.gray(`  ${envKey} already present in .env.example`))
    return
  }
  await fs.writeFile(examplePath, existing + line, 'utf-8')
  console.log(chalk.green(`  Wrote .env.example with ${envKey} placeholder`))
}

async function printCloudKeyGuidance(cwd: string, provider: LlmProviderKind): Promise<void> {
  const envKey = CLOUD_API_KEYS[provider]
  if (!envKey) return

  if (process.env[envKey]) {
    console.log(chalk.green(`  ${envKey} is already set in your environment.`))
    return
  }

  console.log(chalk.yellow(`\n  API key required: ${envKey}`))
  console.log(chalk.gray('  Option 1 — shell profile (~/.zshrc, ~/.bashrc):'))
  console.log(chalk.white(`    export ${envKey}=<your-key>`))
  console.log(chalk.gray('  Option 2 — .env file in your project root (loaded automatically):'))
  console.log(chalk.white(`    echo '${envKey}=<your-key>' >> .env`))

  // Warn about .gitignore only when .env is not already listed
  let gitignoreContent = ''
  try {
    gitignoreContent = await fs.readFile(path.join(cwd, '.gitignore'), 'utf-8')
  } catch {
    // no .gitignore yet
  }
  if (!gitignoreContent.includes('.env')) {
    console.log(chalk.yellow('  Make sure .env is listed in .gitignore to avoid leaking secrets.'))
  }

  const { writeExample } = await inquirer.prompt<{ writeExample: boolean }>([
    {
      type: 'confirm',
      name: 'writeExample',
      message: 'Create / update .env.example with this key placeholder?',
      default: true,
    },
  ])
  if (writeExample) {
    await writeEnvExample(cwd, envKey)
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
        { name: 'Anthropic / Claude (cloud)', value: 'anthropic' },
        { name: 'Google Gemini (cloud)', value: 'gemini' },
        { name: 'Mistral (cloud)', value: 'mistral' },
        { name: 'Groq (cloud, fast inference)', value: 'groq' },
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
        default: model ?? PROVIDER_DEFAULT_MODELS.ollama,
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
    model = model ?? PROVIDER_DEFAULT_MODELS.llamacpp
  } else {
    // All cloud providers: openai, anthropic, gemini, mistral, groq
    baseUrl = undefined
    const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1)
    const ans = await inquirer.prompt<{ model: string }>([
      {
        type: 'input',
        name: 'model',
        message: `${providerLabel} model id`,
        default: model ?? PROVIDER_DEFAULT_MODELS[provider],
      },
    ])
    model = ans.model
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
  console.log(chalk.green(`\nWrote ${path.join(cwd, '.bananarc.json')}`))

  if (provider in CLOUD_API_KEYS) {
    await printCloudKeyGuidance(cwd, provider)
  }
}
