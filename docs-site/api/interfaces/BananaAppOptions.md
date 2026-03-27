[**@banana-universe/bananajs**](../README.md)

***

[@banana-universe/bananajs](../README.md) / BananaAppOptions

# Interface: BananaAppOptions

Defined in: packages/bananajs/src/lib/Core/App.ts:33

## Properties

### abac?

> `optional` **abac?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:77

#### guard

> **guard**: [`AbacGuard`](AbacGuard.md)

***

### auth?

> `optional` **auth?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:44

#### guard

> **guard**: [`AuthGuard`](AuthGuard.md)

***

### cache?

> `optional` **cache?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:68

#### store?

> `optional` **store?**: `"memory"` \| [`CacheStore`](CacheStore.md)

***

### container?

> `optional` **container?**: `AwilixContainer`\<\{ \}\>

Defined in: packages/bananajs/src/lib/Core/App.ts:41

***

### devTools?

> `optional` **devTools?**: `boolean`

Defined in: packages/bananajs/src/lib/Core/App.ts:71

***

### gracefulShutdown?

> `optional` **gracefulShutdown?**: `boolean`

Defined in: packages/bananajs/src/lib/Core/App.ts:42

***

### health?

> `optional` **health?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:61

#### checks?

> `optional` **checks?**: [`HealthCheck`](HealthCheck.md)[]

#### enabled

> **enabled**: `boolean`

#### path?

> `optional` **path?**: `string`

***

### lazyControllers?

> `optional` **lazyControllers?**: `boolean`

Defined in: packages/bananajs/src/lib/Core/App.ts:81

***

### logger?

> `optional` **logger?**: `false` \| [`Logger`](Logger.md)

Defined in: packages/bananajs/src/lib/Core/App.ts:40

***

### metrics?

> `optional` **metrics?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:72

#### enabled

> **enabled**: `boolean`

#### path?

> `optional` **path?**: `string`

***

### middlewares?

> `optional` **middlewares?**: `RequestHandler`\<`ParamsDictionary`, `any`, `any`, `ParsedQs`, `Record`\<`string`, `any`\>\>[]

Defined in: packages/bananajs/src/lib/Core/App.ts:34

***

### plugins?

> `optional` **plugins?**: [`BananaPlugin`](BananaPlugin.md)[]

Defined in: packages/bananajs/src/lib/Core/App.ts:67

***

### rateLimit?

> `optional` **rateLimit?**: `false` \| \{ `max?`: `number`; `message?`: `string`; `windowMs?`: `number`; \}

Defined in: packages/bananajs/src/lib/Core/App.ts:54

***

### requestId?

> `optional` **requestId?**: `boolean`

Defined in: packages/bananajs/src/lib/Core/App.ts:39

***

### security?

> `optional` **security?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:35

#### cors?

> `optional` **cors?**: `false` \| `CorsOptions`

#### helmet?

> `optional` **helmet?**: `boolean` \| `Readonly`\<`HelmetOptions`\>

***

### swagger?

> `optional` **swagger?**: `object`

Defined in: packages/bananajs/src/lib/Core/App.ts:47

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

Defined in: packages/bananajs/src/lib/Core/App.ts:80
