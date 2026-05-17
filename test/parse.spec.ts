import { describe, expect, it } from 'bun:test'
import { compile } from './helpers.ts'
import { readFile } from './utils.ts'

describe('parser', () => {
  it('emits VM code using arithmetic precedence and parentheses', () => {
    const {
      constants: { OpCode },
      VM,
    } = compile(readFile('../fixture/expression'))

    expect(VM.emitted).toEqual([
      OpCode.CONST,
      2,
      OpCode.PUSH,
      OpCode.CONST,
      3,
      OpCode.PUSH,
      OpCode.CONST,
      1,
      OpCode.ADD,
      OpCode.MUL,
    ])
  })

  it('emits store and load instructions for assignment expressions', () => {
    const {
      constants: { OpCode },
      VM,
    } = compile('a = 1; a;')

    expect(VM.emitted).toEqual([
      OpCode.CONST,
      1,
      OpCode.STORE,
      'a',
      OpCode.LOAD,
      'a',
    ])
  })
})
