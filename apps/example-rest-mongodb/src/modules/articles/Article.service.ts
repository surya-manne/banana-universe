import { inject, injectable } from 'tsyringe'
import type { ArticleRepository } from './Article.repository.js'
import { ArticleRepositoryToken } from './Article.repository.js'
import type { Article } from './Article.js'

/** Application-layer orchestration; tsyringe constructor injection. */
@injectable()
export class ArticleAppService {
  constructor(
    @inject(ArticleRepositoryToken)
    public readonly articleRepository: ArticleRepository,
  ) {}

  async create(title: string, body: string): Promise<Article> {
    return this.articleRepository.create({ title, body })
  }
}
