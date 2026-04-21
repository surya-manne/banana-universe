# @banana-universe/bananajs-cli

CLI toolkit for scaffolding, generating, and inspecting BananaJS projects.

## Homepage

https://surya-manne.github.io/banana-universe/

## Installation

```bash
npm install -g @banana-universe/bananajs-cli
```

## Core CLI Commands

- `bananajs new` (or `bjs new`) to scaffold apps
- `bananajs routes` to inspect controller routes
- `bananajs openapi export` to export API docs
- `bananajs ai generate` to generate modules from prompts or schemas

## Minimal Working Setup

```bash
bjs new my-app --preset sql
cd my-app
npm install
npm run dev
```

## API-Level Examples

### Route inspection

```bash
bjs routes --project ./src
```

### OpenAPI export

```bash
bjs openapi export --out openapi.json
```

### AI generation

```bash
bjs ai generate --from-prompt "Create Product module with list and create endpoints"
```

## Documentation

- Project docs: https://surya-manne.github.io/banana-universe/

## License

MIT
