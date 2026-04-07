# @banana-universe/plugin-ai

Framework-level LLM provider plugin for BananaJS. Registers a configured `LlmProvider` on the tsyringe root container so AI-powered controllers and services can receive it via `@inject('AiProvider')`.

## Installation

```bash
npm install @banana-universe/plugin-ai @banana-universe/ai-provider-core
```

You also need a concrete `LlmProvider` implementation. The CLI package ships `OllamaProvider` and `VercelAiProvider`, or you can implement the 4-line `LlmProvider` interface yourself.

## Usage

```typescript
import 'reflect-metadata'
import { BananaApp } from '@banana-universe/bananajs'
import { BananaAiPlugin, AI_PROVIDER_TOKEN } from '@banana-universe/plugin-ai'
import type { LlmProvider } from '@banana-universe/ai-provider-core'
import { inject, injectable } from '@banana-universe/bananajs'

// 1. Pick (or build) a provider
class MyOllamaProvider implements LlmProvider {
  async generate(prompt: string): Promise<string> {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama3.2', prompt, stream: false }),
    })
    const json = await res.json() as { response: string }
    return json.response
  }
}

// 2. Register the plugin
await BananaApp.create({
  plugins: [BananaAiPlugin({ provider: new MyOllamaProvider() })],
  modules: [catalogModule],
})
```

### Injecting the provider in a controller

```typescript
import { inject, injectable, Controller, Post, Body, BaseController } from '@banana-universe/bananajs'
import { AI_PROVIDER_TOKEN } from '@banana-universe/plugin-ai'
import type { LlmProvider } from '@banana-universe/ai-provider-core'
import { z } from 'zod'
import type { Request, Response } from 'express'

const SummarizeSchema = z.object({ text: z.string().max(4000) })
type SummarizeDto = z.infer<typeof SummarizeSchema>

@injectable()
@Controller('catalog')
export class CatalogController extends BaseController {
  constructor(@inject(AI_PROVIDER_TOKEN) private ai: LlmProvider) {
    super()
  }

  @Post('summarize')
  @Body(SummarizeSchema)
  async summarize(req: Request, res: Response): Promise<void> {
    // req.body is validated + typed by @Body
    const { text } = req.body as SummarizeDto
    const summary = await this.ai.generate(`Summarize concisely:\n\n${text}`, { temperature: 0.3 })
    return this.ok(res, { summary })
  }
}
```

## Testing

Override the token in `BananaTestApp` to inject a stub:

```typescript
import { BananaTestApp } from '@banana-universe/bananajs/testing'
import { AI_PROVIDER_TOKEN } from '@banana-universe/plugin-ai'
import type { LlmProvider } from '@banana-universe/ai-provider-core'

const stubProvider: LlmProvider = {
  async generate(): Promise<string> { return 'stubbed summary' },
}

const app = await BananaTestApp.create({
  modules: [catalogModule],
  testOverrides: [{ token: AI_PROVIDER_TOKEN, useValue: stubProvider }],
})
```

---

## ⚠️ Security — Prompt Injection

**This plugin does NOT sanitize user input before LLM calls.**

Handlers that pass user-controlled request data directly to `this.ai.generate()` are exposed to [prompt injection attacks](https://owasp.org/www-project-top-10-for-large-language-model-applications/).

**You MUST:**

1. **Validate and truncate** all user input with a Zod schema via `@Body` before passing it to the LLM.
2. **Never include raw headers or params** (`req.headers`, `req.params`) in system prompts.
3. **Use structured prompt templates** instead of open string interpolation.
4. **Treat LLM output as untrusted** — sanitize or escape before sending as an HTTP response.
5. **Set a `max` length** on string fields in your `@Body` schema to cap token consumption.

```typescript
// ✅ Safe: validated, bounded, templated
const SummarizeSchema = z.object({ text: z.string().min(1).max(4000) })
const summary = await this.ai.generate(`Summarize the following text:\n\n${req.body.text}`)

// ❌ Unsafe: raw user-controlled header in system prompt
const summary = await this.ai.generate(req.headers['x-user-instruction'] as string)
```

---

## Plugin contract

- Registers `AI_PROVIDER_TOKEN` (`"AiProvider"`) on the tsyringe root container.
- Requires `BananaApp.create({ modules: [...] })` or an explicit `container` option — a root container must be present.
- `onShutdown()` is a no-op; providers that hold open connections should implement their own cleanup.
