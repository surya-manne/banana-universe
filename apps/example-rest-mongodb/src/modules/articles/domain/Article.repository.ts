import type { Repository } from '@banana-universe/ddd'
import type { InjectionToken } from 'tsyringe'
import type { Article } from './Article.entity.js'

export type ArticleRepository = Repository<Article>

/** Runtime DI token for the articles persistence port (tsyringe). */
export const ArticleRepositoryToken = Symbol(
  'ArticleRepository',
) as InjectionToken<ArticleRepository>
