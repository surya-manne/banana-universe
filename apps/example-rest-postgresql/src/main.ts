import 'reflect-metadata'
import { createExampleApp, buildTypeOrmOptions } from './bootstrap.js'

const port = Number(process.env.PORT ?? 3000)
const databaseUrl = process.env.DATABASE_URL

const banana = await createExampleApp({
  typeorm: buildTypeOrmOptions(process.env.NODE_ENV === 'test' ? 'sqljs' : 'postgres', databaseUrl),
  enableOtel: process.env.OTEL_ENABLED === 'true',
})

banana.getInstance().listen(port, () => {
  console.log(`example-rest-postgresql listening on ${port}`)
})
