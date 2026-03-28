import { createModule } from '@banana-universe/bananajs'
import { ArticleController } from './ArticleController.js'
import { ArticleModelToken, getArticleModel } from './ArticleModel.js'

export function buildArticlesModule() {
  return createModule({
    id: 'articles',
    controller: ArticleController,
    providers: [{ token: ArticleModelToken, useFactory: () => getArticleModel() }],
  })
}
