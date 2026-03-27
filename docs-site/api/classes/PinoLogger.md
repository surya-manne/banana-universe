[**@banana-universe/bananajs**](../index.md)

***

[@banana-universe/bananajs](../index.md) / PinoLogger

# Class: PinoLogger

Defined in: packages/bananajs/src/lib/Logger/PinoLogger.ts:4

## Implements

- [`Logger`](../interfaces/Logger.md)

## Constructors

### Constructor

> **new PinoLogger**(`options?`): `PinoLogger`

Defined in: packages/bananajs/src/lib/Logger/PinoLogger.ts:7

#### Parameters

##### options?

`LoggerOptions`\<`never`, `boolean`\>

#### Returns

`PinoLogger`

## Methods

### debug()

> **debug**(`message`, `meta?`): `void`

Defined in: packages/bananajs/src/lib/Logger/PinoLogger.ts:26

#### Parameters

##### message

`string`

##### meta?

`Record`\<`string`, `unknown`\>

#### Returns

`void`

#### Implementation of

[`Logger`](../interfaces/Logger.md).[`debug`](../interfaces/Logger.md#debug)

***

### error()

> **error**(`message`, `meta?`): `void`

Defined in: packages/bananajs/src/lib/Logger/PinoLogger.ts:22

#### Parameters

##### message

`string`

##### meta?

`Record`\<`string`, `unknown`\>

#### Returns

`void`

#### Implementation of

[`Logger`](../interfaces/Logger.md).[`error`](../interfaces/Logger.md#error)

***

### info()

> **info**(`message`, `meta?`): `void`

Defined in: packages/bananajs/src/lib/Logger/PinoLogger.ts:14

#### Parameters

##### message

`string`

##### meta?

`Record`\<`string`, `unknown`\>

#### Returns

`void`

#### Implementation of

[`Logger`](../interfaces/Logger.md).[`info`](../interfaces/Logger.md#info)

***

### warn()

> **warn**(`message`, `meta?`): `void`

Defined in: packages/bananajs/src/lib/Logger/PinoLogger.ts:18

#### Parameters

##### message

`string`

##### meta?

`Record`\<`string`, `unknown`\>

#### Returns

`void`

#### Implementation of

[`Logger`](../interfaces/Logger.md).[`warn`](../interfaces/Logger.md#warn)
