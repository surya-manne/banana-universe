const INJECTABLE_KEY = 'banana:injectable'

export const Injectable = (): ClassDecorator => {
  return (target) => {
    Reflect.defineMetadata(INJECTABLE_KEY, true, target)
  }
}

export const isInjectable = (target: unknown): boolean => {
  return Reflect.getMetadata(INJECTABLE_KEY, target as object) === true
}
