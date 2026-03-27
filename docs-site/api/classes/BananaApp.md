[**@banana-universe/bananajs**](../README.md)

***

[@banana-universe/bananajs](../README.md) / BananaApp

# Class: BananaApp

Defined in: packages/bananajs/src/lib/Core/App.ts:91

## Constructors

### Constructor

> **new BananaApp**(`controllers`, `options?`): `BananaApp`

Defined in: packages/bananajs/src/lib/Core/App.ts:101

#### Parameters

##### controllers

[`Constructor`](../type-aliases/Constructor.md)\<`unknown`\>[]

##### options?

[`BananaAppOptions`](../interfaces/BananaAppOptions.md) = `{}`

#### Returns

`BananaApp`

## Methods

### getInstance()

> **getInstance**(): `Application`

Defined in: packages/bananajs/src/lib/Core/App.ts:494

#### Returns

`Application`

***

### getRouteTable()

> **getRouteTable**(): [`RouteInfo`](../interfaces/RouteInfo.md)[]

Defined in: packages/bananajs/src/lib/Core/App.ts:498

#### Returns

[`RouteInfo`](../interfaces/RouteInfo.md)[]

***

### create()

> `static` **create**(`controllers`, `options?`): `Promise`\<`BananaApp`\>

Defined in: packages/bananajs/src/lib/Core/App.ts:162

#### Parameters

##### controllers

[`Constructor`](../type-aliases/Constructor.md)\<`unknown`\>[]

##### options?

[`BananaAppOptions`](../interfaces/BananaAppOptions.md) = `{}`

#### Returns

`Promise`\<`BananaApp`\>
