[**@banana-universe/bananajs**](../index.md)

***

[@banana-universe/bananajs](../index.md) / CreateBananaApplicationOptions

# Interface: CreateBananaApplicationOptions

Defined in: packages/bananajs/src/lib/Core/App.ts:596

Options for [createBananaApplication](../functions/createBananaApplication.md) — extends [BananaAppOptions](BananaAppOptions.md) with optional listen helpers.

## Extends

- [`BananaAppOptions`](BananaAppOptions.md)

## Properties

### abac?

> `optional` **abac?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:101

#### guard

> **guard**: [`AbacGuard`](AbacGuard.md)

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`abac`](BananaAppOptions.md#abac)

***

### apiPrefix?

> `optional` **apiPrefix?**: `string`

Defined in: packages/bananajs/src/lib/Core/App.ts:60

Prepended to every controller base path (e.g. `v1` → `/v1/...`). Use URI versioning per enterprise DX docs.

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`apiPrefix`](BananaAppOptions.md#apiprefix)

***

### auth?

> `optional` **auth?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:67

#### guard

> **guard**: [`AuthGuard`](AuthGuard.md)

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`auth`](BananaAppOptions.md#auth)

***

### cache?

> `optional` **cache?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:92

#### store?

> `optional` **store?**: `"memory"` \| [`CacheStore`](CacheStore.md)

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`cache`](BananaAppOptions.md#cache)

***

### container?

> `optional` **container?**: `DependencyContainer`

Defined in: packages/bananajs/src/lib/Core/App.ts:56

Root tsyringe container; optional — created when using `modules` without an explicit container.

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`container`](BananaAppOptions.md#container)

***

### devTools?

> `optional` **devTools?**: `boolean`

Defined in: packages/bananajs/src/lib/Core/App.ts:95

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`devTools`](BananaAppOptions.md#devtools)

***

### gracefulShutdown?

> `optional` **gracefulShutdown?**: `boolean`

Defined in: packages/bananajs/src/lib/Core/App.ts:65

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`gracefulShutdown`](BananaAppOptions.md#gracefulshutdown)

***

### health?

> `optional` **health?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:85

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

Defined in: packages/bananajs/src/lib/Core/App.ts:599

***

### lazyControllers?

> `optional` **lazyControllers?**: `boolean`

Defined in: packages/bananajs/src/lib/Core/App.ts:105

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`lazyControllers`](BananaAppOptions.md#lazycontrollers)

***

### logger?

> `optional` **logger?**: `false` \| [`Logger`](Logger.md)

Defined in: packages/bananajs/src/lib/Core/App.ts:54

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`logger`](BananaAppOptions.md#logger)

***

### metrics?

> `optional` **metrics?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:96

#### enabled

> **enabled**: `boolean`

#### path?

> `optional` **path?**: `string`

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`metrics`](BananaAppOptions.md#metrics)

***

### middlewares?

> `optional` **middlewares?**: `RequestHandler`\<`ParamsDictionary`, `any`, `any`, `ParsedQs`, `Record`\<`string`, `any`\>\>[]

Defined in: packages/bananajs/src/lib/Core/App.ts:48

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`middlewares`](BananaAppOptions.md#middlewares)

***

### onListening?

> `optional` **onListening?**: (`info`) => `void`

Defined in: packages/bananajs/src/lib/Core/App.ts:600

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

Defined in: packages/bananajs/src/lib/Core/App.ts:91

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`plugins`](BananaAppOptions.md#plugins)

***

### port?

> `optional` **port?**: `number`

Defined in: packages/bananajs/src/lib/Core/App.ts:598

When set, calls `Application.listen` after the app is created.

***

### rateLimit?

> `optional` **rateLimit?**: `false` \| \{ `max?`: `number`; `message?`: `string`; `windowMs?`: `number`; \}

Defined in: packages/bananajs/src/lib/Core/App.ts:78

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`rateLimit`](BananaAppOptions.md#ratelimit)

***

### requestId?

> `optional` **requestId?**: `boolean`

Defined in: packages/bananajs/src/lib/Core/App.ts:53

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`requestId`](BananaAppOptions.md#requestid)

***

### security?

> `optional` **security?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:49

#### cors?

> `optional` **cors?**: `false` \| `CorsOptions`

#### helmet?

> `optional` **helmet?**: `boolean` \| `Readonly`\<`HelmetOptions`\>

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`security`](BananaAppOptions.md#security)

***

### swagger?

> `optional` **swagger?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:70

#### description?

> `optional` **description?**: `string`

#### enabled?

> `optional` **enabled?**: `boolean`

Defaults to `true` — omit or set to `false` to disable.

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

Defined in: packages/bananajs/src/lib/Core/App.ts:104

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`tenant`](BananaAppOptions.md#tenant)

***

### testOverrides?

> `optional` **testOverrides?**: [`BananaProviderRegistration`](../type-aliases/BananaProviderRegistration.md)[]

Defined in: packages/bananajs/src/lib/Core/App.ts:64

Applied to the root container after plugin/module setup — for tests (e.g. swap a repository port for a fake).

#### Inherited from

[`BananaAppOptions`](BananaAppOptions.md).[`testOverrides`](BananaAppOptions.md#testoverrides)
