[**@banana-universe/bananajs**](../index.md)

***

[@banana-universe/bananajs](../index.md) / defineBananaAppOptions

# Function: defineBananaAppOptions()

## Call Signature

> **defineBananaAppOptions**(`options`): [`BananaAppCreateInput`](../type-aliases/BananaAppCreateInput.md)

Defined in: packages/bananajs/src/lib/DI/bananaBootstrap.ts:32

Build [BananaAppOptions](../interfaces/BananaAppOptions.md) with optional `services` merged into the Awilix container.
When `controllers` is set, it is normalized via [defineBananaControllers](defineBananaControllers.md).

### Parameters

#### options

`Omit`\<[`BananaAppOptions`](../interfaces/BananaAppOptions.md), `"container"`\> & `object` & `object`

### Returns

[`BananaAppCreateInput`](../type-aliases/BananaAppCreateInput.md)

## Call Signature

> **defineBananaAppOptions**(`options`): [`BananaAppOptions`](../interfaces/BananaAppOptions.md)

Defined in: packages/bananajs/src/lib/DI/bananaBootstrap.ts:35

Build [BananaAppOptions](../interfaces/BananaAppOptions.md) with optional `services` merged into the Awilix container.
When `controllers` is set, it is normalized via [defineBananaControllers](defineBananaControllers.md).

### Parameters

#### options

[`DeclarativeBananaOptions`](../type-aliases/DeclarativeBananaOptions.md)

### Returns

[`BananaAppOptions`](../interfaces/BananaAppOptions.md)
