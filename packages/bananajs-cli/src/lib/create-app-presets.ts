/**
 * Declarative app scaffolds: each preset is data (id, labels) plus a pure function
 * that returns relative paths and file contents — no git clone or remote templates.
 */

/** Keep dependency ranges aligned with published @banana-universe packages. */
export const SCAFFOLD_VERSIONS = {
  bananajs: '^0.6.0',
  bananajsCli: '^0.3.0',
  ddd: '^0.1.0',
  pluginMongoose: '^0.1.0',
  pluginTypeorm: '^0.1.0',
} as const

/** Self-contained ESLint flat config for generated apps (no monorepo parent file). */
const STANDALONE_ESLINT_CONFIG_MJS = `import eslint from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = dirname(fileURLToPath(import.meta.url))

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: appRoot,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    files: ['**/__tests__/**/*.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
  eslintConfigPrettier,
)
`

const STANDALONE_PRETTIERRC = `{
  "arrowParens": "always",
  "bracketSpacing": true,
  "quoteProps": "as-needed",
  "singleQuote": true,
  "semi": false,
  "printWidth": 100,
  "useTabs": false,
  "tabWidth": 2,
  "trailingComma": "all"
}
`

export type AppPresetId = 'mongodb' | 'sql'

export type ScaffoldContext = {
  /** Display name / folder name */
  appName: string
  /** package.json "name" field (npm-safe) */
  packageName: string
}

export type ScaffoldFile = { relativePath: string; content: string }

export type AppPreset = {
  id: AppPresetId
  /** Shown in interactive prompt */
  promptLabel: string
  description: string
  buildFiles: (ctx: ScaffoldContext) => ScaffoldFile[]
}

const sharedTsconfig = (): string =>
  JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        outDir: 'dist',
        rootDir: 'src',
        strict: true,
        experimentalDecorators: true,
        skipLibCheck: true,
        types: ['node'],
      },
      include: ['src/**/*.ts'],
    },
    null,
    2,
  )

const sharedGitignore = (): string =>
  ['node_modules/', 'dist/', '.env', '*.log', '.DS_Store'].join('\n') + '\n'

const sharedDevDependencies = () => ({
  '@banana-universe/bananajs-cli': SCAFFOLD_VERSIONS.bananajsCli,
  '@eslint/js': '^9.8.0',
  '@types/node': '^22.0.0',
  eslint: '^9.8.0',
  'eslint-config-prettier': '^9.0.0',
  prettier: '^2.6.2',
  tsx: '^4.19.2',
  typescript: '~5.7.2',
  'typescript-eslint': '^8.19.0',
})

function mongoPackageJson(ctx: ScaffoldContext): string {
  return JSON.stringify(
    {
      name: ctx.packageName,
      version: '0.1.0',
      private: true,
      type: 'module',
      description: `BananaJS app (${ctx.appName}) — MongoDB / Mongoose`,
      scripts: {
        dev: 'tsx watch src/main.ts',
        build: 'tsc -p tsconfig.json',
        start: 'node dist/main.js',
        lint: 'eslint src',
        'lint:fix': 'eslint src --fix',
        format: 'prettier --write "src/**/*.ts"',
        'format:check': 'prettier --check "src/**/*.ts"',
      },
      dependencies: {
        dotenv: '^16.4.5',
        '@banana-universe/bananajs': SCAFFOLD_VERSIONS.bananajs,
        '@banana-universe/ddd': SCAFFOLD_VERSIONS.ddd,
        '@banana-universe/plugin-mongoose': SCAFFOLD_VERSIONS.pluginMongoose,
        tsyringe: '^4.8.0',
        express: '^4.21.2',
        mongoose: '^8.9.0',
        'reflect-metadata': '^0.2.2',
        zod: '^3.24.0',
      },
      devDependencies: sharedDevDependencies(),
    },
    null,
    2,
  )
}

function sqlPackageJson(ctx: ScaffoldContext): string {
  return JSON.stringify(
    {
      name: ctx.packageName,
      version: '0.1.0',
      private: true,
      type: 'module',
      description: `BananaJS app (${ctx.appName}) — PostgreSQL / TypeORM`,
      scripts: {
        dev: 'tsx watch src/main.ts',
        build: 'tsc -p tsconfig.json',
        start: 'node dist/main.js',
        lint: 'eslint src',
        'lint:fix': 'eslint src --fix',
        format: 'prettier --write "src/**/*.ts"',
        'format:check': 'prettier --check "src/**/*.ts"',
      },
      dependencies: {
        dotenv: '^16.4.5',
        '@banana-universe/bananajs': SCAFFOLD_VERSIONS.bananajs,
        '@banana-universe/ddd': SCAFFOLD_VERSIONS.ddd,
        '@banana-universe/plugin-typeorm': SCAFFOLD_VERSIONS.pluginTypeorm,
        tsyringe: '^4.8.0',
        express: '^4.21.2',
        pg: '^8.13.1',
        'reflect-metadata': '^0.2.2',
        typeorm: '^0.3.20',
        zod: '^3.24.0',
      },
      devDependencies: sharedDevDependencies(),
    },
    null,
    2,
  )
}

function mongoReadme(ctx: ScaffoldContext): string {
  return `# ${ctx.appName}

**BananaJS** is a TypeScript framework on Express with decorator-based routing, Zod validation, and pluggable persistence—see the [documentation](https://surya-manne.github.io/banana-universe/) and [repository](https://github.com/surya-manne/banana-universe).

This project was generated with \`bananajs new\` (**MongoDB / Mongoose** preset). Layout: **feature modules** under \`src/modules/<feature>/\` using \`createModule\` (BananaJS v0.6+).

## Scripts

| Script | Description |
| ------ | ----------- |
| \`npm run dev\` | TypeScript + **hot reload** (\`tsx watch\`) |
| \`npm run build\` | Compile to \`dist/\` |
| \`npm start\` | Run compiled app |
| \`npm run lint\` / \`npm run lint:fix\` | ESLint (type-aware) |
| \`npm run format\` / \`npm run format:check\` | Prettier |

## Setup

\`\`\`bash
npm install
cp .env.example .env   # set DATABASE_URL
npm run dev
# or: npm run build && npm start
\`\`\`

## Endpoints

- \`GET /articles/healthz\` — liveness
- \`POST /articles\` — create article (JSON body: \`title\`, \`body\`)
`
}

function sqlReadme(ctx: ScaffoldContext): string {
  return `# ${ctx.appName}

**BananaJS** is a TypeScript framework on Express with decorator-based routing, Zod validation, and pluggable persistence—see the [documentation](https://surya-manne.github.io/banana-universe/) and [repository](https://github.com/surya-manne/banana-universe).

This project was generated with \`bananajs new\` (**PostgreSQL / TypeORM** preset). Layout: **feature modules** under \`src/modules/<feature>/\` using \`createModule\` (BananaJS v0.6+).

## Scripts

| Script | Description |
| ------ | ----------- |
| \`npm run dev\` | TypeScript + **hot reload** (\`tsx watch\`) |
| \`npm run build\` | Compile to \`dist/\` |
| \`npm start\` | Run compiled app |
| \`npm run lint\` / \`npm run lint:fix\` | ESLint (type-aware) |
| \`npm run format\` / \`npm run format:check\` | Prettier |

## Setup

\`\`\`bash
npm install
cp .env.example .env   # set DATABASE_URL for PostgreSQL
npm run dev
# or: npm run build && npm start
\`\`\`

## Endpoints

- \`GET /healthz\` — liveness

The scaffold includes a minimal \`NoteEntity\` so TypeORM can synchronize schema (\`synchronize: true\` — disable in production).
`
}

function buildMongoFiles(ctx: ScaffoldContext): ScaffoldFile[] {
  return [
    { relativePath: 'package.json', content: mongoPackageJson(ctx) },
    { relativePath: 'tsconfig.json', content: sharedTsconfig() },
    { relativePath: '.gitignore', content: sharedGitignore() },
    { relativePath: '.prettierrc', content: STANDALONE_PRETTIERRC },
    { relativePath: 'eslint.config.mjs', content: STANDALONE_ESLINT_CONFIG_MJS },
    {
      relativePath: '.env.example',
      content: 'DATABASE_URL=mongodb://127.0.0.1:27017/bananajs_app\nPORT=3000\n',
    },
    { relativePath: 'README.md', content: mongoReadme(ctx) },
    {
      relativePath: 'src/main.ts',
      content: `import 'dotenv/config'
import 'reflect-metadata'
import { createMongoApp } from './bootstrap.js'

const port = Number(process.env.PORT ?? 3000)
const banana = await createMongoApp()
banana.getInstance().listen(port, () => {
  console.log(\`${ctx.appName} listening on \${port}\`)
})
`,
    },
    {
      relativePath: 'src/bootstrap.ts',
      content: `import 'reflect-metadata'
import mongoose from 'mongoose'
import {
  BananaApp,
  type BananaPlugin,
  defineBananaAppOptions,
} from '@banana-universe/bananajs'
import { MongoosePlugin } from '@banana-universe/plugin-mongoose'
import { buildArticlesModule } from './modules/articles/ArticlesModule.js'

export async function createMongoApp(): Promise<BananaApp> {
  const uri = process.env.DATABASE_URL ?? 'mongodb://127.0.0.1:27017/bananajs_app'
  await mongoose.connect(uri)

  return BananaApp.create(
    defineBananaAppOptions({
      modules: [buildArticlesModule()],
      plugins: [MongoosePlugin(mongoose.connection) as BananaPlugin],
      logger: false,
      gracefulShutdown: false,
      rateLimit: false,
      requestId: false,
      security: { helmet: false, cors: false },
    }),
  )
}
`,
    },
    {
      relativePath: 'src/modules/articles/ArticlesModule.ts',
      content: `import { createModule } from '@banana-universe/bananajs'
import { ArticleController } from './ArticleController.js'
import { ArticleModelToken, getArticleModel } from './ArticleModel.js'

export function buildArticlesModule() {
  return createModule({
    id: 'articles',
    controller: ArticleController,
    providers: [{ token: ArticleModelToken, useFactory: () => getArticleModel() }],
  })
}
`,
    },
    {
      relativePath: 'src/modules/articles/ArticleController.ts',
      content: `import 'reflect-metadata'
import type { Request, Response } from 'express'
import type { Model } from 'mongoose'
import { inject } from 'tsyringe'
import { BaseController, Body, Controller, Get, Post, Public } from '@banana-universe/bananajs'
import type { ArticleDoc } from './ArticleModel.js'
import { ArticleModelToken } from './ArticleModel.js'
import { CreateArticleSchema } from './ArticleSchema.js'

@Controller('articles')
export class ArticleController extends BaseController {
  constructor(@inject(ArticleModelToken) private readonly articleModel: Model<ArticleDoc>) {
    super()
  }

  @Get('healthz')
  @Public()
  health(_req: Request, res: Response) {
    return this.ok(res, 'ok', { status: 'up' })
  }

  @Post('')
  @Body(CreateArticleSchema)
  async create(req: Request, res: Response) {
    const { title, body } = req.body as { title: string; body: string }
    const created = await this.articleModel.create({ title, body })
    return this.ok(res, 'created', { id: String(created._id), title: created.title })
  }
}
`,
    },
    {
      relativePath: 'src/modules/articles/ArticleModel.ts',
      content: `import type { InjectionToken } from 'tsyringe'
import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

export type ArticleDoc = HydratedDocument<{
  title: string
  body: string
}>

const articleSchema = new Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
  },
  { collection: 'articles' },
)

export const ArticleModelToken = Symbol('ArticleModel') as InjectionToken<Model<ArticleDoc>>

/** Registers the model on the default Mongoose connection (see \`mongoose.connect\` in bootstrap). */
export function getArticleModel(): Model<ArticleDoc> {
  const existing = mongoose.models['Article'] as Model<ArticleDoc> | undefined
  return existing ?? mongoose.model<ArticleDoc>('Article', articleSchema)
}
`,
    },
    {
      relativePath: 'src/modules/articles/ArticleSchema.ts',
      content: `import { z } from 'zod'

export const CreateArticleSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
})
`,
    },
  ]
}

function buildSqlFiles(ctx: ScaffoldContext): ScaffoldFile[] {
  return [
    { relativePath: 'package.json', content: sqlPackageJson(ctx) },
    { relativePath: 'tsconfig.json', content: sharedTsconfig() },
    { relativePath: '.gitignore', content: sharedGitignore() },
    { relativePath: '.prettierrc', content: STANDALONE_PRETTIERRC },
    { relativePath: 'eslint.config.mjs', content: STANDALONE_ESLINT_CONFIG_MJS },
    {
      relativePath: '.env.example',
      content: 'DATABASE_URL=postgres://postgres:postgres@localhost:5432/bananajs_app\nPORT=3000\n',
    },
    { relativePath: 'README.md', content: sqlReadme(ctx) },
    {
      relativePath: 'src/main.ts',
      content: `import 'dotenv/config'
import 'reflect-metadata'
import { createSqlApp } from './bootstrap.js'

const port = Number(process.env.PORT ?? 3000)
const banana = await createSqlApp()
banana.getInstance().listen(port, () => {
  console.log(\`${ctx.appName} listening on \${port}\`)
})
`,
    },
    {
      relativePath: 'src/bootstrap.ts',
      content: `import 'reflect-metadata'
import {
  BananaApp,
  type BananaPlugin,
  createModule,
  defineBananaAppOptions,
} from '@banana-universe/bananajs'
import { TypeOrmPlugin } from '@banana-universe/plugin-typeorm'
import { HealthController } from './modules/health/HealthController.js'
import { NoteEntity } from './modules/health/NoteEntity.js'

const healthModule = createModule({
  id: 'health',
  controller: HealthController,
  providers: [],
})

export async function createSqlApp(): Promise<BananaApp> {
  return BananaApp.create(
    defineBananaAppOptions({
      modules: [healthModule],
      plugins: [TypeOrmPlugin(buildTypeOrmOptions()) as BananaPlugin],
      logger: false,
      gracefulShutdown: false,
      rateLimit: false,
      requestId: false,
      security: { helmet: false, cors: false },
    }),
  )
}

function buildTypeOrmOptions(): Record<string, unknown> {
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/bananajs_app',
    entities: [NoteEntity],
    synchronize: true,
  }
}
`,
    },
    {
      relativePath: 'src/modules/health/HealthController.ts',
      content: `import 'reflect-metadata'
import type { Request, Response } from 'express'
import { BaseController, Controller, Get, Public } from '@banana-universe/bananajs'

@Controller('')
export class HealthController extends BaseController {
  @Get('healthz')
  @Public()
  health(_req: Request, res: Response) {
    return this.ok(res, 'ok', { status: 'up' })
  }
}
`,
    },
    {
      relativePath: 'src/modules/health/NoteEntity.ts',
      content: `import 'reflect-metadata'
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity({ name: 'notes' })
export class NoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 200 })
  title!: string
}
`,
    },
  ]
}

export const APP_PRESETS: AppPreset[] = [
  {
    id: 'mongodb',
    promptLabel: 'MongoDB',
    description: 'Mongoose plugin, sample Article API',
    buildFiles: buildMongoFiles,
  },
  {
    id: 'sql',
    promptLabel: 'SQL',
    description: 'TypeORM + PostgreSQL, health check + minimal entity',
    buildFiles: buildSqlFiles,
  },
]

export function getPresetById(id: string): AppPreset | undefined {
  return APP_PRESETS.find((p) => p.id === id)
}

export function npmPackageNameFromAppName(appName: string): string {
  const slug = appName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_.]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (slug.length === 0) return 'bananajs-app'
  if (/^\d/.test(slug)) return `app-${slug}`
  return slug
}
