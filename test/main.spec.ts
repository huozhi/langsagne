import { describe, expect, it } from 'bun:test'
import { execute, inspect } from '../src/index.ts'
import { readFile } from './utils.ts'

describe('language execution', () => {
  it('groups operators by precedence and evaluates equal precedence left to right', () => {
    expect(execute('8 / 4 / 2;')).toBe(1)
    expect(execute('8 / (4 / 2);')).toBe(4)
    expect(execute('2 + 3 * 4;')).toBe(14)
  })

  it('executes the assignment fixture', () => {
    const result = inspect(readFile('../examples/assignment'))
    expect(result.result).toBe(3)
    expect(result.env.a).toBe(1)
    expect(result.env.b).toBe(3)
  })

  it('executes the loop fixture', () => {
    const result = inspect(readFile('../examples/loop'))
    expect(result.result).toBe(1)
    expect(result.env.i).toBe(2)
    expect(result.env.sum).toBe(1)
  })

  it('executes the complex expression fixture', () => {
    const result = inspect(readFile('../examples/complex-expression'))
    expect(result.result).toBe(41)
    expect(result.env.base).toBe(14)
    expect(result.env.offset).toBe(27)
  })

  it('executes the weighted loop fixture', () => {
    const result = inspect(readFile('../examples/weighted-loop'))
    expect(result.result).toBe(16)
    expect(result.env.i).toBe(4)
    expect(result.env.sum).toBe(12)
  })

  it('executes the print flow fixture', () => {
    const logs: unknown[][] = []
    const originalLog = console.log
    console.log = (...values: unknown[]) => { logs.push(values) }

    try {
      const result = inspect(readFile('../examples/print-flow'))
      expect(result.result).toBe(11)
      expect(result.env.a).toBe(7)
      expect(result.env.b).toBe(11)
      expect(logs).toEqual([[7]])
    } finally {
      console.log = originalLog
    }
  })

  it('executes the function call fixture', () => {
    const result = inspect(readFile('../examples/function-call'))
    expect(result.result).toBe(11)
    expect(result.env.result).toBe(11)
  })

  it('executes the if else example', () => {
    const result = inspect(readFile('../examples/if-else'))
    expect(result.result).toBe(2)
    expect(result.env.result).toBe(2)
  })

  it('executes the assertions example until the failed assertion', () => {
    expect(() => execute(readFile('../examples/assertions'))).toThrow('RUNTIME ERR: assert failed')
  })

  it('executes if and else branches', () => {
    expect(execute(`value = 0;
if (value) {
  result = 1;
} else {
  result = 2;
}
result;`)).toBe(2)

    expect(execute(`value = 1;
if (value) {
  result = 1;
} else {
  result = 2;
}
result;`)).toBe(1)
  })

  it('executes a function call through the public API', () => {
    const result = execute(`fn add(a, b) {
  return a + b;
}
add(1, 2);`)

    expect(result).toBe(3)
  })

  it('rejects function calls with the wrong arity', () => {
    expect(() => execute(`fn add(a, b) {
  return a + b;
}
add(1);`)).toThrow('RUNTIME ERR: add expected 2 args but got 1')
  })

  it('exposes a single public execute API', () => {
    const result = execute('a = 1; b = a + 2; b;')

    expect(result).toBe(3)
  })

  it('prints multiple arguments', () => {
    const logs: unknown[][] = []
    const originalLog = console.log
    console.log = (...values: unknown[]) => { logs.push(values) }

    try {
      execute('result = 2; print("result =", result);')

      expect(logs).toEqual([['result =', 2]])
    } finally {
      console.log = originalLog
    }
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

  it('executes assert system calls with expression arguments', () => {
    expect(execute('assert(1 + 2 < 4); 7;')).toBe(7)
  })

  it('executes clock system calls', () => {
    const now = Date.now
    Date.now = () => 123

    try {
      expect(execute('clock();')).toBe(123)
    } finally {
      Date.now = now
    }
  })

  it('rejects failed assertions', () => {
    expect(() => execute('assert(1 + 2 < 3);')).toThrow('RUNTIME ERR: assert failed')
  })
})
