import { randomUUID } from 'node:crypto'
import { inject, injectable } from 'tsyringe'
import type { ArticleRepository } from '../domain/Article.repository.js'
import { ArticleRepositoryToken } from '../domain/Article.repository.js'
import { Article } from '../domain/Article.entity.js'

/** Application-layer orchestration (DDD); tsyringe constructor injection. */
@injectable()
export class ArticleAppService {
  constructor(
    @inject(ArticleRepositoryToken)
    public readonly articleRepository: ArticleRepository,
  ) {}

  async create(title: string, body: string): Promise<Article> {
    const now = new Date()
    const entity = new Article({
      id: randomUUID(),
      title,
      body,
      createdAt: now,
      updatedAt: now,
    })
    return this.articleRepository.save(entity)
  }
}
