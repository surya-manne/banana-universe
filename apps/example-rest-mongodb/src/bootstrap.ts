import 'reflect-metadata'
import mongoose from 'mongoose'
import {
  BananaApp,
  type BananaPlugin,
  defineBananaAppOptions,
  defineBananaControllers,
} from '@banana-universe/bananajs'
import { MongoosePlugin } from '@banana-universe/plugin-mongoose'
import { ArticleController } from './article.controller.js'
import { getArticleModel, ArticleModelToken } from './article.model.js'

export async function createMongoApp(): Promise<BananaApp> {
  const uri = process.env.DATABASE_URL ?? 'mongodb://127.0.0.1:27017/banana_example'
  const connection = await mongoose.createConnection(uri).asPromise()

  return BananaApp.create(
    defineBananaAppOptions({
      controllers: defineBananaControllers(ArticleController),
      providers: [
        {
          token: ArticleModelToken,
          useFactory: () => getArticleModel(connection),
        },
        ArticleController,
      ],
      plugins: [MongoosePlugin(connection) as BananaPlugin],
      logger: false,
      gracefulShutdown: false,
      rateLimit: false,
      requestId: false,
      security: { helmet: false, cors: false },
    }),
  )
}
