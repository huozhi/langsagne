import { describe, expect, it } from 'bun:test'
import { parse, run, tokenize, trace, type DirectiveItem, type Program } from '../src/index.ts'
import { Directive as D } from '../src/runtime/directive.ts'

const program = (directives: DirectiveItem[], functions: Program['functions'] = new Map()): Program =>
  ({ directives, sites: new Map(), functions })

describe('vm', () => {
  it('starts each run and trace with fresh state', () => {
    const input = parse(tokenize('value = 7; value;'))
    expect(run(input)).toBe(7)
    expect(trace(input)[0].before.env).toEqual({})
    expect(trace(input).at(-1)?.after.env).toEqual({ value: 7 })
    expect(run(parse(tokenize('value;')))).toBeUndefined()
  })

  it('executes arithmetic bytecode and records trace steps', () => {
    const input = program([D.CONST, 3, D.PUSH, D.CONST, 20, D.ADD, D.EXIT])
    expect(run(input)).toBe(23)
    const steps = trace(input)
    expect(steps.map(step => step.op)).toEqual([D.CONST, D.PUSH, D.CONST, D.ADD, D.EXIT])
    expect(steps.at(-1)?.after.ax).toBe(23)
    expect(steps.at(-1)?.after.vs).toEqual([])
  })

  it('executes assert directives', () => {
    expect(run(program([D.CONST, 1, D.ASSERT, D.EXIT]))).toBe(1)
    expect(() => run(program([D.CONST, 0, D.ASSERT]))).toThrow('RUNTIME ERR: assert failed')
  })

  it('executes clock directives', () => {
    const now = Date.now
    Date.now = () => 123
    try { expect(run(program([D.CLOCK, D.EXIT]))).toBe(123) }
    finally { Date.now = now }
  })

  it('binds function arguments and returns to the caller', () => {
    const functions = new Map([['add', { entry: 2, params: ['a', 'b'] }]])
    const input = program([
      D.JMP, 9,
      D.LOAD, 'a', D.PUSH, D.LOAD, 'b', D.ADD, D.RET,
      D.CONST, 1, D.PUSH, D.CONST, 2, D.PUSH, D.CALL, 'add', 2, D.EXIT,
    ], functions)
    expect(run(input)).toBe(3)
  })

  it('checks call arity', () => {
    const functions = new Map([['add', { entry: 2, params: ['a', 'b'] }]])
    expect(() => run(program([
      D.JMP, 3, D.RET, D.CONST, 1, D.PUSH, D.CALL, 'add', 1,
    ], functions))).toThrow('RUNTIME ERR: add expected 2 args but got 1')
  })

  it('executes branches and jumps', () => {
    expect(run(program([
      D.CONST, 0, D.BZ, 8, D.CONST, 99, D.JMP, 10, D.CONST, 42, D.EXIT,
    ]))).toBe(42)
  })
})
