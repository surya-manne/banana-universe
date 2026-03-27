[**@banana-universe/bananajs**](../README.md)

***

[@banana-universe/bananajs](../README.md) / Body

# Function: Body()

> **Body**(`dto`, `skipMissingProperties?`): (`target`, `propertyName`, `descriptor`) => `void`

Defined in: packages/bananajs/src/lib/Validator/Validator.decorator.ts:64

Decorator for validating the body of a request.
Utilizes a specified DTO class and validation rules.

## Parameters

### dto

(...`args`) => `unknown`

The data transfer object class to validate against.

### skipMissingProperties?

`boolean` = `false`

Whether to skip validation for missing properties.

## Returns

A method decorator that performs validation on the body of the request.

(`target`, `propertyName`, `descriptor`) => `void`
