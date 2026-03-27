import { Entity } from '@banana-universe/ddd'

export interface CatalogItemProps {
  id: string
  name: string
  sku: string
  createdAt: Date
  updatedAt: Date
}

export class CatalogItem extends Entity<CatalogItemProps> {
  constructor(props: CatalogItemProps) {
    super(props)
  }

  get name(): string {
    return this.props.name
  }

  get sku(): string {
    return this.props.sku
  }
}
