# LLM providers

BananaJS treats AI as **bring-your-own-model**. The `bjs` CLI and the `@banana-universe/plugin-ai` runtime share one tiny contract — **`LlmProvider`** — and any provider that satisfies it can drive AI workflows. Switch from OpenAI to Anthropic to a local Ollama model by changing one config field.

<div class="note note-ai">

**The framework is the harness, not the model.** BananaJS owns the prompts, validation schemas, and the [PRPAV pipeline](/ai/) (Prepare → Research → Plan → Act → Validate). You bring the LLM. Nothing in this design assumes a specific vendor.

</div>

## The contract — `@banana-universe/ai-provider-core`

The contract is intentionally small. Implementing a new provider is ~20 lines of code.

```typescript
// packages/ai-provider-core/src/index.ts
export interface LlmGenerateOptions {
  model?:       string
  temperature?: number
  system?:      string
}

export interface LlmProvider {
  generate(prompt: string, options?: LlmGenerateOptions): Promise<string>
}

export const AI_PROVIDER_TOKEN = 'AiProvider' as const
```

`generate` returns a string. The framework wraps it with prompt scaffolding, schema-guided parsing, and validation — your provider doesn't have to know about any of that.

## The two surfaces that consume it

| Surface | Where it runs | How it gets the provider |
|---|---|---|
| **`bjs ai *` CLI** | Developer's machine, build time | Reads `.bananarc.json` written by `bjs ai setup`; loads the matching provider at runtime |
| **`BananaAiPlugin`** | Inside your running BananaJS app | Registers your provider on the tsyringe root container; handlers `@inject(AI_PROVIDER_TOKEN)` to use it |

The two are independent — you can use one, the other, or both.

## Built-in providers

The CLI ships adapters for the providers most teams reach for. Pick one with `bjs ai setup`; it writes `.bananarc.json` and you're done.

| Provider | Mode | Where the key/endpoint goes |
|---|---|---|
| **OpenAI** | hosted | env `OPENAI_API_KEY` |
| **Anthropic** (Claude) | hosted | env `ANTHROPIC_API_KEY` |
| **Google Gemini** | hosted | env `GOOGLE_API_KEY` |
| **AWS Bedrock** | hosted | AWS SDK credentials chain |
| **Ollama** | local | env `OLLAMA_HOST` (default `http://localhost:11434`) |
| **llama.cpp** | local | env `LLAMACPP_HOST` |

```bash
$ bjs ai setup
✓ Select provider: OpenAI / Anthropic / Gemini / Bedrock / Ollama / llama.cpp
✓ Model name (e.g. gpt-4o-mini, claude-3-5-haiku, llama3.1:8b)
✓ Reads relevant env vars at runtime — no keys written to .bananarc.json
✓ Configuration written to .bananarc.json
```

The resulting `.bananarc.json` looks like:

```json
{
  "ai": {
    "provider": "anthropic",
    "model":    "claude-3-5-haiku-20241022",
    "temperature": 0.2
  },
  "generate": {
    "defaultOrm":   "typeorm",
    "preset":       "sql"
  }
}
```

## Inject a provider into your running app

For AI-powered handlers (a summarizer endpoint, a moderation service, a chat route), register the provider once via the plugin and inject it where you need it.

### 1. Install

```bash
npm install @banana-universe/plugin-ai @banana-universe/ai-provider-core
```

### 2. Register in bootstrap

```typescript
import { BananaApp } from '@banana-universe/bananajs'
import { BananaAiPlugin } from '@banana-universe/plugin-ai'
import { OpenAiProvider } from './providers/openai.provider.js'

await BananaApp.create({
  controllers: defineBananaControllers(SummaryController),
  plugins: [
    BananaAiPlugin({
      provider: new OpenAiProvider({
        apiKey: process.env.OPENAI_API_KEY!,
        model:  'gpt-4o-mini',
      }),
    }),
  ],
})
```

### 3. Inject into a controller or service

```typescript
import { Controller, Post, Body, BaseController, inject, injectable } from '@banana-universe/bananajs'
import { AI_PROVIDER_TOKEN, type LlmProvider } from '@banana-universe/ai-provider-core'
import { z } from 'zod'

const SummariseSchema = z.object({ text: z.string().min(50).max(20_000) })

@Controller('summary')
@injectable()
export class SummaryController extends BaseController {
  constructor(@inject(AI_PROVIDER_TOKEN) private ai: LlmProvider) {
    super()
  }

  @Post('')
  @Body(SummariseSchema)
  async summarise(req: Request, res: Response) {
    const { text } = req.body as z.infer<typeof SummariseSchema>
    const summary = await this.ai.generate(text, {
      system: 'You produce concise, neutral 3-sentence summaries.',
      temperature: 0.2,
    })
    return this.ok(res, 'Summary', { summary })
  }
}
```

The controller depends only on the **`LlmProvider`** contract. Swap providers in bootstrap; the route doesn't change.

## Writing your own provider

Any class that satisfies the interface works. Common reasons to roll your own: a private model gateway, a cost/policy wrapper around a hosted provider, a routing provider that picks a model per request.

```typescript
import type { LlmProvider, LlmGenerateOptions } from '@banana-universe/ai-provider-core'

export class InternalGatewayProvider implements LlmProvider {
  constructor(private readonly baseUrl: string, private readonly token: string) {}

  async generate(prompt: string, opts?: LlmGenerateOptions): Promise<string> {
    const res = await fetch(`${this.baseUrl}/v1/complete`, {
      method:  'POST',
      headers: {
        'content-type':  'application/json',
        'authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        prompt,
        model:       opts?.model       ?? 'default',
        system:      opts?.system,
        temperature: opts?.temperature ?? 0.2,
      }),
    })
    if (!res.ok) throw new Error(`LLM gateway ${res.status}`)
    const json = (await res.json()) as { output: string }
    return json.output
  }
}
```

Keep providers **pure**: no imports from `@banana-universe/bananajs`, no side effects. The CLI loads them in any context (even outside a running app) and the runtime registers them in a container.

## Choosing a model

| Goal | Reasonable starting point |
|---|---|
| Cheapest CI checks (`ai review`, `ai context`) | `claude-3-5-haiku`, `gpt-4o-mini`, local `llama3.1:8b` |
| Fastest module generation | `claude-3-5-sonnet`, `gpt-4o` |
| Air-gapped / sensitive code | Ollama or llama.cpp with a 7-13B local model |
| Best-effort hardest reasoning | `claude-opus-4`, `gpt-4o` |

Costs and capabilities change quickly — re-evaluate every few months and update `.bananarc.json` accordingly. The framework doesn't pin you to a model choice.

## Related

- [AI hub](/ai/) — the harness, the PRPAV pipeline, the nine guided scenarios
- [AI commands reference](/tooling/ai-commands) — every `bjs ai` flag
- [CLI reference — `bjs ai setup`](/tooling/cli#bjs-ai) — provider configuration
- [Plugins overview](/plugins/overview) — how `BananaAiPlugin` slots into bootstrap
