import { Entity } from '@banana-universe/ddd'

export interface ArticleProps {
  id: string
  title: string
  body: string
  createdAt: Date
  updatedAt: Date
}

export class Article extends Entity<ArticleProps> {
  constructor(props: ArticleProps) {
    super(props)
  }

  get title(): string {
    return this.props.title
  }

  get body(): string {
    return this.props.body
  }
}
