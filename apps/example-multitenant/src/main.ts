import 'reflect-metadata'
import { buildTypeOrmOptions, startTenantApp } from './bootstrap.js'

const port = Number(process.env.PORT ?? 3000)
const databaseUrl = process.env.DATABASE_URL

await startTenantApp(
  port,
  buildTypeOrmOptions(process.env.NODE_ENV === 'test' ? 'sqljs' : 'postgres', databaseUrl),
)
