import 'reflect-metadata'
import mongoose from 'mongoose'
import { BananaApp, type BananaPlugin, defineBananaAppOptions } from '@banana-universe/bananajs'
import { MongoosePlugin } from '@banana-universe/plugin-mongoose'
import { TypeOrmPlugin } from '@banana-universe/plugin-typeorm'
import { tagsModule } from './modules/tags/index.js'
import { widgetsModule } from './modules/widgets/index.js'
import { WidgetOrmEntity } from './modules/widgets/infrastructure/Widget.orm-entity.js'

export { WidgetOrmEntity }

export async function createDualOrmApp(options: {
  mongoUri: string
  typeorm: Record<string, unknown>
}): Promise<BananaApp> {
  await mongoose.connect(options.mongoUri)

  return BananaApp.create(
    defineBananaAppOptions({
      modules: [tagsModule, widgetsModule],
      plugins: [
        TypeOrmPlugin(options.typeorm) as BananaPlugin,
        MongoosePlugin(mongoose.connection) as BananaPlugin,
      ],
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
      entities: [WidgetOrmEntity],
      synchronize: true,
    }
  }
  return {
    type: 'postgres',
    url: databaseUrl ?? 'postgres://postgres:postgres@localhost:5432/widgets',
    entities: [WidgetOrmEntity],
    synchronize: true,
  }
}
