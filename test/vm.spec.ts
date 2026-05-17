import { describe, expect, it } from 'bun:test'
import { runtime } from './helpers.ts'

describe('vm', () => {
  it('loads and executes arithmetic bytecode', () => {
    const {
      constants: { Directive },
      Store,
      VM,
    } = runtime('')

    VM.emitAll([
      Directive.CONST,
      3,
      Directive.PUSH,
      Directive.CONST,
      20,
      Directive.ADD,
      Directive.EXIT,
    ])
    VM.execute()

    expect(Store.ax).toBe(23)
  })

  it('records execution trace steps', () => {
    const {
      constants: { Directive },
      VM,
    } = runtime('')

    VM.emitAll([
      Directive.CONST,
      1,
      Directive.PUSH,
      Directive.CONST,
      2,
      Directive.ADD,
      Directive.EXIT,
    ])

    const trace = VM.trace()

    expect(trace.map(step => step.op)).toEqual([
      Directive.CONST,
      Directive.PUSH,
      Directive.CONST,
      Directive.ADD,
      Directive.EXIT,
    ])
    expect(trace.at(-1)?.after.ax).toBe(3)
    expect(trace.at(-1)?.after.vs).toEqual([])
  })

  it('executes branch and jump directives', () => {
    const {
      constants: { Directive },
      Store,
      VM,
    } = runtime('')

    VM.emitAll([
      Directive.CONST,
      0,
      Directive.BZ,
      8,
      Directive.CONST,
      99,
      Directive.JMP,
      10,
      Directive.CONST,
      42,
      Directive.EXIT,
    ])
    VM.execute()

    expect(Store.ax).toBe(42)
  })
})
