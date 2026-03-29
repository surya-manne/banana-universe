import { Entity } from '@banana-universe/ddd'

export interface WidgetProps {
  id: string
  label: string
  code: string
  createdAt: Date
  updatedAt: Date
}

export class Widget extends Entity<WidgetProps> {
  constructor(props: WidgetProps) {
    super(props)
  }

  get label(): string {
    return this.props.label
  }

  get code(): string {
    return this.props.code
  }
}
