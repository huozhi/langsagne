import { describe, expect, it } from 'bun:test'
import { execute } from '../src/index.ts'
import { compile } from './helpers.ts'
import { readFile } from './utils.ts'

describe('language execution', () => {
  it('executes the assignment fixture', () => {
    const { storage, VM } = compile(readFile('../fixture/assignment'))

    VM.execute()

    expect(storage.Store.ax).toBe(3)
    expect(storage.Store.env.get('a')).toBe(1)
    expect(storage.Store.env.get('b')).toBe(3)
  })

  it('executes the loop fixture', () => {
    const { storage, VM } = compile(readFile('../fixture/loop'))

    VM.execute()

    expect(storage.Store.ax).toBe(1)
    expect(storage.Store.env.get('i')).toBe(2)
    expect(storage.Store.env.get('sum')).toBe(1)
  })

  it('exposes a single public execute API', () => {
    const result = execute('a = 1; b = a + 2; b;')

    expect(result).toBe(3)
  })
})
