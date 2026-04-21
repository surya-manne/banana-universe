import 'reflect-metadata'
import { BananaApp, type BananaPlugin, defineBananaAppOptions } from '@banana-universe/bananajs'
import { TypeOrmPlugin } from '@banana-universe/plugin-typeorm'
import { OpenTelemetryPlugin } from '@banana-universe/plugin-otel'
import { BearerAuthGuard } from './lib/BearerAuthGuard.js'
import { catalogModule } from './modules/catalog/index.js'
import { CatalogItemOrmEntity } from './modules/catalog/CatalogItem.repository.js'

export { CatalogItemOrmEntity }

export async function createExampleApp(options: {
  typeorm: Record<string, unknown>
  enableOtel?: boolean
}): Promise<BananaApp> {
  const plugins: BananaPlugin[] = [TypeOrmPlugin(options.typeorm) as BananaPlugin]
  if (options.enableOtel) {
    plugins.push(
      OpenTelemetryPlugin({
        serviceName: 'example-rest-postgresql',
      }) as BananaPlugin,
    )
  }

  return BananaApp.create(
    defineBananaAppOptions({
      modules: [catalogModule],
      plugins,
      auth: { guard: new BearerAuthGuard() },
      swagger: { enabled: true },
      logger: false,
      gracefulShutdown: false,
      rateLimit: false,
      requestId: false,
      security: { helmet: false, cors: false },
    }),
  )
}

export function buildTypeOrmOptions(
  mode: 'postgres' | 'sqljs',
  databaseUrl?: string,
): Record<string, unknown> {
  if (mode === 'sqljs') {
    return {
      type: 'sqljs',
      autoSave: false,
      location: ':memory:',
      entities: [CatalogItemOrmEntity],
      synchronize: true,
    }
  }
  return {
    type: 'postgres',
    url: databaseUrl ?? 'postgres://postgres:postgres@localhost:5432/catalog',
    entities: [CatalogItemOrmEntity],
    synchronize: true,
  }
}
