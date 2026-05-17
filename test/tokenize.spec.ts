import { describe, expect, it } from 'bun:test'
import { freshRuntime } from './helpers.ts'

describe('tokenizer', () => {
  it('recognizes keywords, identifiers, operators, and numbers', () => {
    const {
      constants: { TokenKind },
      Context,
      next,
      Source,
      SymbolTable,
    } = freshRuntime()

    Source.initialize('while (count_1 < 42) {}')

    next()
    expect(Context.token).toBe(TokenKind.While)

    next()
    expect(Context.token).toBe('(')

    next()
    expect(Context.token).toBe(TokenKind.Identifier)
    expect(Context.value).toBe('count_1')
    expect(SymbolTable.find('count_1')).toMatchObject({
      class: TokenKind.Global,
      type: TokenKind.Identifier,
    })

    next()
    expect(Context.token).toBe(TokenKind.LessThan)

    next()
    expect(Context.token).toBe(TokenKind.Number)
    expect(Context.value).toBe(42)
  })

  it('recognizes function and return keywords', () => {
    const {
      constants: { TokenKind },
      Context,
      next,
      Source,
    } = freshRuntime()

    Source.initialize('fn add() { return 1; }')

    next()
    expect(Context.token).toBe(TokenKind.Function)

    next()
    expect(Context.token).toBe(TokenKind.Identifier)
    expect(Context.value).toBe('add')

    next()
    expect(Context.token).toBe('(')

    next()
    expect(Context.token).toBe(')')

    next()
    expect(Context.token).toBe('{')

    next()
    expect(Context.token).toBe(TokenKind.Return)
  })
})
