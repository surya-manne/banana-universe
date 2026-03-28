import 'reflect-metadata'
import {
  BananaApp,
  type BananaPlugin,
  defineBananaAppOptions,
  defineBananaControllers,
} from '@banana-universe/bananajs'
import { TypeOrmPlugin } from '@banana-universe/plugin-typeorm'
import { OpenTelemetryPlugin } from '@banana-universe/plugin-otel'
import { BearerAuthGuard } from './lib/bearer-auth-guard.js'
import { CatalogController } from './catalog/catalog.controller.js'
import { CatalogAppService } from './catalog/application/catalog.app-service.js'
import { CatalogItemTypeOrmRepository } from './catalog/infrastructure/catalog-item.typeorm-repository.js'
import { CatalogItemRepositoryToken } from './catalog/domain/catalog-item.repository.js'
import { CatalogItemOrmEntity } from './catalog/infrastructure/catalog-item.orm-entity.js'

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
      controllers: defineBananaControllers(CatalogController),
      providers: [
        { token: CatalogItemRepositoryToken, useClass: CatalogItemTypeOrmRepository },
        CatalogAppService,
        CatalogController,
      ],
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
