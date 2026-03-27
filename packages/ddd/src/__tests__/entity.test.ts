import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { Entity } from '../Entity.js'
import { ValueObject } from '../ValueObject.js'

class UserId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    super({ value })
  }
}

class User extends Entity<{ id: string; createdAt?: Date }> {
  constructor(id: string) {
    super({ id })
  }
}

describe('Entity', () => {
  it('equals by id', () => {
    const a = new User('1')
    const b = new User('1')
    assert.equal(a.equals(b), true)
    const c = new User('2')
    assert.equal(a.equals(c), false)
  })
})

describe('ValueObject', () => {
  it('structural equality', () => {
    const a = new UserId('x')
    const b = new UserId('x')
    const c = new UserId('y')
    assert.equal(a.equals(b), true)
    assert.equal(a.equals(c), false)
  })
})
