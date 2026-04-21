# @banana-universe/ai-provider-core

Shared contracts for AI provider implementations used by BananaJS packages.

## Homepage

https://surya-manne.github.io/banana-universe/

## Installation

```bash
npm install @banana-universe/ai-provider-core
```

## Core API Surface

- `LlmProvider`
- `LlmGenerateOptions`
- `AI_PROVIDER_TOKEN`

## Minimal Working Setup

```ts
import type { LlmProvider, LlmGenerateOptions } from '@banana-universe/ai-provider-core';

class EchoProvider implements LlmProvider {
  async generate(prompt: string, options?: LlmGenerateOptions): Promise<string> {
    return '[model=' + (options?.model ?? 'default') + '] ' + prompt;
  }
}
```

## Typical Usage With DI Token

```ts
import { AI_PROVIDER_TOKEN } from '@banana-universe/ai-provider-core';
import { inject, injectable } from '@banana-universe/bananajs';

@injectable()
class AiService {
  constructor(@inject(AI_PROVIDER_TOKEN) private readonly provider: LlmProvider) {}
}
```

## Documentation

- Project docs: https://surya-manne.github.io/banana-universe/

## License

MIT
