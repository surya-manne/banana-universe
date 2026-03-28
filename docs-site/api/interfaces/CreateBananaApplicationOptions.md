[**@banana-universe/bananajs**](../index.md)

***

[@banana-universe/bananajs](../index.md) / CreateBananaApplicationOptions

# Interface: CreateBananaApplicationOptions

Defined in: packages/bananajs/src/lib/Core/App.ts:537

Options for [createBananaApplication](../functions/createBananaApplication.md) — extends [BananaAppOptions](BananaAppOptions.md) with optional listen helpers.

## Extends

- [`BananaAppOptions`](BananaAppOptions.md)

## Properties

### abac?

> `optional` **abac?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:86

#### guard

> **guard**: [`AbacGuard`](AbacGuard.md)

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`abac`](BananaAppOptions.md#abac)

***

### auth?

> `optional` **auth?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:53

#### guard

> **guard**: [`AuthGuard`](AuthGuard.md)

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`auth`](BananaAppOptions.md#auth)

***

### cache?

> `optional` **cache?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:77

#### store?

> `optional` **store?**: `"memory"` \| [`CacheStore`](CacheStore.md)

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`cache`](BananaAppOptions.md#cache)

***

### container?

> `optional` **container?**: `AwilixContainer`\<\{ \}\>

Defined in: packages/bananajs/src/lib/Core/App.ts:50

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`container`](BananaAppOptions.md#container)

***

### devTools?

> `optional` **devTools?**: `boolean`

Defined in: packages/bananajs/src/lib/Core/App.ts:80

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`devTools`](BananaAppOptions.md#devtools)

***

### gracefulShutdown?

> `optional` **gracefulShutdown?**: `boolean`

Defined in: packages/bananajs/src/lib/Core/App.ts:51

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`gracefulShutdown`](BananaAppOptions.md#gracefulshutdown)

***

### health?

> `optional` **health?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:70

#### checks?

> `optional` **checks?**: [`HealthCheck`](HealthCheck.md)[]

#### enabled

> **enabled**: `boolean`

#### path?

> `optional` **path?**: `string`

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`health`](BananaAppOptions.md#health)

***

### hostname?

> `optional` **hostname?**: `string`

Defined in: packages/bananajs/src/lib/Core/App.ts:540

***

### lazyControllers?

> `optional` **lazyControllers?**: `boolean`

Defined in: packages/bananajs/src/lib/Core/App.ts:90

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`lazyControllers`](BananaAppOptions.md#lazycontrollers)

***

### logger?

> `optional` **logger?**: `false` \| [`Logger`](Logger.md)

Defined in: packages/bananajs/src/lib/Core/App.ts:49

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`logger`](BananaAppOptions.md#logger)

***

### metrics?

> `optional` **metrics?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:81

#### enabled

> **enabled**: `boolean`

#### path?

> `optional` **path?**: `string`

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`metrics`](BananaAppOptions.md#metrics)

***

### middlewares?

> `optional` **middlewares?**: `RequestHandler`\<`ParamsDictionary`, `any`, `any`, `ParsedQs`, `Record`\<`string`, `any`\>\>[]

Defined in: packages/bananajs/src/lib/Core/App.ts:43

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`middlewares`](BananaAppOptions.md#middlewares)

***

### onListening?

> `optional` **onListening?**: (`info`) => `void`

Defined in: packages/bananajs/src/lib/Core/App.ts:541

#### Parameters

##### info

###### hostname?

`string`

###### port

`number`

#### Returns

`void`

***

### plugins?

> `optional` **plugins?**: [`BananaPlugin`](BananaPlugin.md)[]

Defined in: packages/bananajs/src/lib/Core/App.ts:76

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`plugins`](BananaAppOptions.md#plugins)

***

### port?

> `optional` **port?**: `number`

Defined in: packages/bananajs/src/lib/Core/App.ts:539

When set, calls `Application.listen` after the app is created.

***

### rateLimit?

> `optional` **rateLimit?**: `false` \| \{ `max?`: `number`; `message?`: `string`; `windowMs?`: `number`; \}

Defined in: packages/bananajs/src/lib/Core/App.ts:63

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`rateLimit`](BananaAppOptions.md#ratelimit)

***

### requestId?

> `optional` **requestId?**: `boolean`

Defined in: packages/bananajs/src/lib/Core/App.ts:48

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`requestId`](BananaAppOptions.md#requestid)

***

### security?

> `optional` **security?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:44

#### cors?

> `optional` **cors?**: `false` \| `CorsOptions`

#### helmet?

> `optional` **helmet?**: `boolean` \| `Readonly`\<`HelmetOptions`\>

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`security`](BananaAppOptions.md#security)

***

### swagger?

> `optional` **swagger?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:56

#### description?

> `optional` **description?**: `string`

#### enabled

> **enabled**: `boolean`

#### path?

> `optional` **path?**: `string`

#### title?

> `optional` **title?**: `string`

#### version?

> `optional` **version?**: `string`

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`swagger`](BananaAppOptions.md#swagger)

***

### tenant?

> `optional` **tenant?**: [`TenantOptions`](TenantOptions.md)

Defined in: packages/bananajs/src/lib/Core/App.ts:89

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`tenant`](BananaAppOptions.md#tenant)
