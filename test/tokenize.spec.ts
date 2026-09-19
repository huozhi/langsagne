import { describe, expect, it } from 'bun:test'
import { tokenize } from '../src/index.ts'
import { TokenKind } from '../src/lexer/token-kind.ts'

describe('tokenizer', () => {
  it('recognizes keywords, identifiers, operators, and numbers', () => {
    const tokens = tokenize('while (count_1 < 42) {}')
    expect(tokens.map(token => token.kind)).toEqual([
      TokenKind.While, '(', TokenKind.Identifier, TokenKind.LessThan,
      TokenKind.Number, ')', '{', '}',
    ])
    expect(tokens[2].value).toBe('count_1')
    expect(tokens[4].value).toBe(42)
  })

  it('recognizes function and return keywords', () => {
    const tokens = tokenize('fn add() { return 1; }')
    expect(tokens.map(token => token.kind)).toContain(TokenKind.Function)
    expect(tokens.map(token => token.kind)).toContain(TokenKind.Return)
    expect(tokens[1].value).toBe('add')
  })

  it('recognizes string literals and source positions', () => {
    const tokens = tokenize('print("hello")\n  42')
    expect(tokens[2].kind).toBe(TokenKind.String)
    expect(tokens[2].value).toBe('hello')
    expect(tokens.at(-1)).toMatchObject({ kind: TokenKind.Number, line: 2, column: 3 })
  })
})
