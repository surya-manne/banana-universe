[**@banana-universe/bananajs**](../index.md)

***

[@banana-universe/bananajs](../index.md) / BananaAppOptions

# Interface: BananaAppOptions

Defined in: packages/bananajs/src/lib/Core/App.ts:47

## Extended by

- [`CreateBananaApplicationOptions`](CreateBananaApplicationOptions.md)

## Properties

### abac?

> `optional` **abac?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:100

#### guard

> **guard**: [`AbacGuard`](AbacGuard.md)

***

### apiPrefix?

> `optional` **apiPrefix?**: `string`

Defined in: packages/bananajs/src/lib/Core/App.ts:60

Prepended to every controller base path (e.g. `v1` → `/v1/...`). Use URI versioning per enterprise DX docs.

***

### auth?

> `optional` **auth?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:67

#### guard

> **guard**: [`AuthGuard`](AuthGuard.md)

***

### cache?

> `optional` **cache?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:91

#### store?

> `optional` **store?**: `"memory"` \| [`CacheStore`](CacheStore.md)

***

### container?

> `optional` **container?**: `DependencyContainer`

Defined in: packages/bananajs/src/lib/Core/App.ts:56

Root tsyringe container; optional — created when using `modules` without an explicit container.

***

### devTools?

> `optional` **devTools?**: `boolean`

Defined in: packages/bananajs/src/lib/Core/App.ts:94

***

### gracefulShutdown?

> `optional` **gracefulShutdown?**: `boolean`

Defined in: packages/bananajs/src/lib/Core/App.ts:65

***

### health?

> `optional` **health?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:84

#### checks?

> `optional` **checks?**: [`HealthCheck`](HealthCheck.md)[]

#### enabled

> **enabled**: `boolean`

#### path?

> `optional` **path?**: `string`

***

### lazyControllers?

> `optional` **lazyControllers?**: `boolean`

Defined in: packages/bananajs/src/lib/Core/App.ts:104

***

### logger?

> `optional` **logger?**: `false` \| [`Logger`](Logger.md)

Defined in: packages/bananajs/src/lib/Core/App.ts:54

***

### metrics?

> `optional` **metrics?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:95

#### enabled

> **enabled**: `boolean`

#### path?

> `optional` **path?**: `string`

***

### middlewares?

> `optional` **middlewares?**: `RequestHandler`\<`ParamsDictionary`, `any`, `any`, `ParsedQs`, `Record`\<`string`, `any`\>\>[]

Defined in: packages/bananajs/src/lib/Core/App.ts:48

***

### plugins?

> `optional` **plugins?**: [`BananaPlugin`](BananaPlugin.md)[]

Defined in: packages/bananajs/src/lib/Core/App.ts:90

***

### rateLimit?

> `optional` **rateLimit?**: `false` \| \{ `max?`: `number`; `message?`: `string`; `windowMs?`: `number`; \}

Defined in: packages/bananajs/src/lib/Core/App.ts:77

***

### requestId?

> `optional` **requestId?**: `boolean`

Defined in: packages/bananajs/src/lib/Core/App.ts:53

***

### security?

> `optional` **security?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:49

#### cors?

> `optional` **cors?**: `false` \| `CorsOptions`

#### helmet?

> `optional` **helmet?**: `boolean` \| `Readonly`\<`HelmetOptions`\>

***

### swagger?

> `optional` **swagger?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:70

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

***

### tenant?

> `optional` **tenant?**: [`TenantOptions`](TenantOptions.md)

Defined in: packages/bananajs/src/lib/Core/App.ts:103

***

### testOverrides?

> `optional` **testOverrides?**: [`BananaProviderRegistration`](../type-aliases/BananaProviderRegistration.md)[]

Defined in: packages/bananajs/src/lib/Core/App.ts:64

Applied to the root container after plugin/module setup — for tests (e.g. swap a repository port for a fake).
