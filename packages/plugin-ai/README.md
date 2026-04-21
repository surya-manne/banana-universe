# @banana-universe/plugin-ai

BananaJS plugin that registers an `LlmProvider` in the root DI container.

## Homepage

https://surya-manne.github.io/banana-universe/

## Installation

```bash
npm install @banana-universe/plugin-ai @banana-universe/ai-provider-core
```

## Core API Surface

- `BananaAiPlugin({ provider })`
- `AI_PROVIDER_TOKEN`

## Minimal Working Setup

```ts
import { BananaApp, inject, injectable } from '@banana-universe/bananajs';
import { BananaAiPlugin, AI_PROVIDER_TOKEN, type LlmProvider } from '@banana-universe/plugin-ai';

class EchoProvider implements LlmProvider {
  async generate(prompt: string) {
    return 'echo: ' + prompt;
  }
}

@injectable()
class AiService {
  constructor(@inject(AI_PROVIDER_TOKEN) private readonly provider: LlmProvider) {}
}

await BananaApp.create({
  controllers: [],
  plugins: [BananaAiPlugin({ provider: new EchoProvider() })],
});
```

## Documentation

- Project docs: https://surya-manne.github.io/banana-universe/

## License

MIT
