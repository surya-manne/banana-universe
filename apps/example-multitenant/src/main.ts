import 'reflect-metadata'
import { createTenantApp, buildTypeOrmOptions } from './bootstrap.js'

const port = Number(process.env.PORT ?? 3000)
const databaseUrl = process.env.DATABASE_URL

const banana = await createTenantApp(
  buildTypeOrmOptions(process.env.NODE_ENV === 'test' ? 'sqljs' : 'postgres', databaseUrl),
)
banana.getInstance().listen(port, () => {
  console.log(`example-multitenant listening on ${port}`)
})
