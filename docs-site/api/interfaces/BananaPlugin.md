[**@banana-universe/bananajs**](../README.md)

***

[@banana-universe/bananajs](../README.md) / BananaPlugin

# Interface: BananaPlugin

Defined in: packages/bananajs/src/lib/Plugin/Plugin.interface.ts:11

## Properties

### name

> **name**: `string`

Defined in: packages/bananajs/src/lib/Plugin/Plugin.interface.ts:12

## Methods

### onReady()?

> `optional` **onReady**(`ctx`): `void` \| `Promise`\<`void`\>

Defined in: packages/bananajs/src/lib/Plugin/Plugin.interface.ts:14

#### Parameters

##### ctx

[`AppContext`](AppContext.md)

#### Returns

`void` \| `Promise`\<`void`\>

***

### onShutdown()?

> `optional` **onShutdown**(): `void` \| `Promise`\<`void`\>

Defined in: packages/bananajs/src/lib/Plugin/Plugin.interface.ts:15

#### Returns

`void` \| `Promise`\<`void`\>

***

### register()

> **register**(`ctx`): `void` \| `Promise`\<`void`\>

Defined in: packages/bananajs/src/lib/Plugin/Plugin.interface.ts:13

#### Parameters

##### ctx

[`AppContext`](AppContext.md)

#### Returns

`void` \| `Promise`\<`void`\>
