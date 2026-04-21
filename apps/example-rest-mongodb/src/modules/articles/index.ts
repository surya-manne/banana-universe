import { createModule } from '@banana-universe/bananajs'
import { ArticleController } from './Article.controller.js'
import { ArticleAppService } from './Article.service.js'
import { ArticleMongooseRepository, ArticleRepositoryToken } from './Article.repository.js'

export const articlesModule = createModule({
  id: 'articles',
  controller: ArticleController,
  providers: [
    { token: ArticleRepositoryToken, useClass: ArticleMongooseRepository },
    ArticleAppService,
  ],
})
