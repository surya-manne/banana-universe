import 'dotenv/config'
import 'reflect-metadata'
import { createDualOrmApp, buildTypeOrmOptions } from './bootstrap.js'

const port = Number(process.env.PORT ?? 3000)
/** MongoDB for the tags module (Mongoose). */
const mongoUri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/banana_dual_orm'
/** PostgreSQL URL for the widgets module (TypeORM) when not using in-memory sqljs in tests. */
const postgresUrl = process.env.DATABASE_URL

const banana = await createDualOrmApp({
  mongoUri,
  typeorm: buildTypeOrmOptions(process.env.NODE_ENV === 'test' ? 'sqljs' : 'postgres', postgresUrl),
})

banana.getInstance().listen(port, () => {
  console.log(`example-rest-dual-orm listening on ${port}`)
})
