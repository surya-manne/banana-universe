import { deepEqual } from './utils/deepEqual.js'

export abstract class ValueObject<T extends object> {
  protected readonly props: T

  constructor(props: T) {
    this.props = Object.freeze({ ...props }) as T
  }

  equals(other: ValueObject<T>): boolean {
    return deepEqual(this.props, other.props)
  }
}
