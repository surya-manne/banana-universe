import 'reflect-metadata'
import type { DataSource } from 'typeorm'
import { createContainer, asFunction } from 'awilix'
import { BananaApp, type Constructor } from '@banana-universe/bananajs'
import { TypeOrmPlugin } from '@banana-universe/plugin-typeorm'
import { BearerAuthGuard } from './lib/bearer-auth-guard.js'
import { DemoAbacGuard } from './lib/demo-abac-guard.js'
import { NoteController } from './note/note.controller.js'
import { NoteAppService } from './note/note.app-service.js'
import { TenantNoteOrmEntity } from './note/note.orm-entity.js'

export { TenantNoteOrmEntity }

export async function createTenantApp(typeorm: Record<string, unknown>): Promise<BananaApp> {
  const container = createContainer()
  container.register({
    noteAppService: asFunction(
      (cradle: { dataSource: DataSource }) => new NoteAppService(cradle.dataSource),
    ).singleton(),
    noteController: asFunction(
      (cradle: { noteAppService: NoteAppService }) => new NoteController(cradle.noteAppService),
    ).singleton(),
  })

  return BananaApp.create([NoteController as unknown as Constructor], {
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
  })
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
