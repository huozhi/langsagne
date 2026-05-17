import { describe, expect, it } from 'bun:test'
import { freshRuntime } from './helpers.ts'

describe('vm', () => {
  it('loads and executes arithmetic bytecode', () => {
    const {
      constants: { OpCode },
      storage: { Store },
      VM,
    } = freshRuntime()

    VM.load([
      OpCode.CONST,
      3,
      OpCode.PUSH,
      OpCode.CONST,
      20,
      OpCode.ADD,
      OpCode.EXIT,
    ])
    VM.execute()

    expect(Store.ax).toBe(23)
  })

  it('records execution trace steps', () => {
    const {
      constants: { OpCode },
      VM,
    } = freshRuntime()

    VM.load([
      OpCode.CONST,
      1,
      OpCode.PUSH,
      OpCode.CONST,
      2,
      OpCode.ADD,
      OpCode.EXIT,
    ])

    const trace = VM.execute({ trace: true })

    expect(trace.map(step => step.op)).toEqual([
      OpCode.CONST,
      OpCode.PUSH,
      OpCode.CONST,
      OpCode.ADD,
      OpCode.EXIT,
    ])
    expect(trace.at(-1)?.after.ax).toBe(3)
    expect(trace.at(-1)?.after.vs).toEqual([])
  })

  it('executes branch and jump directives', () => {
    const {
      constants: { OpCode },
      storage: { Store },
      VM,
    } = freshRuntime()

    VM.load([
      OpCode.CONST,
      0,
      OpCode.BZ,
      8,
      OpCode.CONST,
      99,
      OpCode.JMP,
      10,
      OpCode.CONST,
      42,
      OpCode.EXIT,
    ])
    VM.execute()

    expect(Store.ax).toBe(42)
  })
})
