import { createModule } from '@banana-universe/bananajs'
import { ArticleController } from './Article.controller.js'
import { ArticleAppService } from './application/Article.service.js'
import { ArticleMongooseRepository } from './infrastructure/Article.mongoose-repository.js'
import { ArticleRepositoryToken } from './domain/Article.repository.js'

export const articlesModule = createModule({
  id: 'articles',
  controller: ArticleController,
  providers: [
    { token: ArticleRepositoryToken, useClass: ArticleMongooseRepository },
    ArticleAppService,
  ],
})
