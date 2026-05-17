import { describe, expect, it } from 'bun:test'
import { execute } from '../src/index.ts'
import { compile } from './helpers.ts'
import { readFile } from './utils.ts'

describe('language execution', () => {
  it('executes the assignment fixture', () => {
    const { Store, VM } = compile(readFile('../fixture/assignment'))

    VM.execute()

    expect(Store.ax).toBe(3)
    expect(Store.env.get('a')).toBe(1)
    expect(Store.env.get('b')).toBe(3)
  })

  it('executes the loop fixture', () => {
    const { Store, VM } = compile(readFile('../fixture/loop'))

    VM.execute()

    expect(Store.ax).toBe(1)
    expect(Store.env.get('i')).toBe(2)
    expect(Store.env.get('sum')).toBe(1)
  })

  it('exposes a single public execute API', () => {
    const result = execute('a = 1; b = a + 2; b;')

    expect(result).toBe(3)
  })

  it('prints a value and returns it from execute', () => {
    const logs: unknown[][] = []
    const originalLog = console.log
    console.log = (...values: unknown[]) => { logs.push(values) }

    try {
      const result = execute('print(1 + 2);')

      expect(result).toBe(3)
      expect(logs).toEqual([[3]])
    } finally {
      console.log = originalLog
    }
  })
})
