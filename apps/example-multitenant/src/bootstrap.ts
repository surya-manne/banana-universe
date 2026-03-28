import 'reflect-metadata'
import type { DataSource } from 'typeorm'
import { createContainer, asFunction } from 'awilix'
import {
  BananaApp,
  type BananaAppOptions,
  createBananaApplication,
  defineBananaControllers,
} from '@banana-universe/bananajs'
import { TypeOrmPlugin } from '@banana-universe/plugin-typeorm'
import { BearerAuthGuard } from './lib/bearer-auth-guard.js'
import { DemoAbacGuard } from './lib/demo-abac-guard.js'
import { NoteController } from './note/note.controller.js'
import { NoteAppService } from './note/note.app-service.js'
import { TenantNoteOrmEntity } from './note/note.orm-entity.js'

export { TenantNoteOrmEntity }

/** Shared TypeORM options for the tenant demo (postgres or in-memory sql.js for tests). */
export function buildTypeOrmOptions(
  mode: 'postgres' | 'sqljs',
  databaseUrl?: string,
): Record<string, unknown> {
  if (mode === 'sqljs') {
    return {
      type: 'sqljs',
      autoSave: false,
      location: ':memory:',
      entities: [TenantNoteOrmEntity],
      synchronize: true,
    }
  }
  return {
    type: 'postgres',
    url: databaseUrl ?? 'postgres://postgres:postgres@localhost:5432/tenant_demo',
    entities: [TenantNoteOrmEntity],
    synchronize: true,
  }
}

/** Declarative BananaJS options for the multitenant notes API (Awilix + plugins + guards). */
export function buildTenantAppOptions(typeorm: Record<string, unknown>): BananaAppOptions {
  const container = createContainer()
  container.register({
    noteAppService: asFunction(
      (cradle: { dataSource: DataSource }) => new NoteAppService(cradle.dataSource),
    ).singleton(),
    noteController: asFunction(
      (cradle: { noteAppService: NoteAppService }) => new NoteController(cradle.noteAppService),
    ).singleton(),
  })

  return {
    container,
    plugins: [TypeOrmPlugin(typeorm) as import('@banana-universe/bananajs').BananaPlugin],
    auth: { guard: new BearerAuthGuard() },
    abac: { guard: new DemoAbacGuard() },
    tenant: { header: 'x-tenant-id' },
    logger: false,
    gracefulShutdown: false,
    rateLimit: false,
    requestId: false,
    security: { helmet: false, cors: false },
  }
}

/** For tests and programmatic use: creates the app without calling `listen`. */
export async function createTenantApp(typeorm: Record<string, unknown>) {
  return BananaApp.create({
    controllers: defineBananaControllers(NoteController),
    ...buildTenantAppOptions(typeorm),
  })
}

/** Starts the HTTP server using core `createBananaApplication` (async plugin lifecycle + optional listen). */
export async function startTenantApp(
  port: number,
  typeorm: Record<string, unknown>,
): Promise<void> {
  await createBananaApplication({
    controllers: defineBananaControllers(NoteController),
    ...buildTenantAppOptions(typeorm),
    port,
    onListening: ({ port: p }) => {
      console.log(`example-multitenant listening on ${p}`)
    },
  })
}
