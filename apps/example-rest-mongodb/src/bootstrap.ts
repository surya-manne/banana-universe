import 'reflect-metadata'
import mongoose from 'mongoose'
import { BananaApp, type BananaPlugin, defineBananaAppOptions } from '@banana-universe/bananajs'
import { MongoosePlugin } from '@banana-universe/plugin-mongoose'
import { buildArticlesModule } from './modules/articles/ArticlesModule.js'

export async function createMongoApp(): Promise<BananaApp> {
  const uri = process.env.DATABASE_URL ?? 'mongodb://127.0.0.1:27017/banana_example'
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
