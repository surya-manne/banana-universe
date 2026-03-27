[**@banana-universe/bananajs**](../index.md)

***

[@banana-universe/bananajs](../index.md) / DeclarativeBananaOptions

# Type Alias: DeclarativeBananaOptions

> **DeclarativeBananaOptions** = `Omit`\<[`BananaAppOptions`](../interfaces/BananaAppOptions.md), `"container"`\> & `object`

Defined in: packages/bananajs/src/lib/DI/bananaBootstrap.ts:14

## Type Declaration

### container?

> `optional` **container?**: `AwilixContainer`

### services?

> `optional` **services?**: [`BananaServiceRegistrations`](BananaServiceRegistrations.md)

Merged into a new container, or into `container` when both are set.
