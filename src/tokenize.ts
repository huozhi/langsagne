import { TokenKind } from './lexer/token-kind.ts'
import type { Token } from './types.ts'

const keywords: Record<string, number> = {
  while: TokenKind.While, if: TokenKind.If, else: TokenKind.Else,
  fn: TokenKind.Function, return: TokenKind.Return,
}
const operators: Record<string, number> = {
  '+': TokenKind.Add, '-': TokenKind.Subtract, '*': TokenKind.Multiply,
  '/': TokenKind.Divide, '=': TokenKind.Assign, '<': TokenKind.LessThan,
}

export function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let index = 0
  let line = 1
  let column = 1
  const read = () => {
    const ch = source[index++]
    if (ch === '\n') { line++; column = 1 } else column++
    return ch
  }
  const add = (kind: Token['kind'], value: Token['value'], startLine: number, startColumn: number) => {
    tokens.push({ kind, value, line: startLine, column: startColumn, length: Math.max(1, column - startColumn) })
  }
  const digit = (ch: string | undefined) => ch !== undefined && ch >= '0' && ch <= '9'
  const alpha = (ch: string | undefined) => ch !== undefined && /[a-zA-Z_]/.test(ch)

  while (index < source.length) {
    const startLine = line
    const startColumn = column
    const ch = read()
    if (digit(ch)) {
      let value = Number(ch)
      while (digit(source[index])) value = value * 10 + Number(read())
      add(TokenKind.Number, value, startLine, startColumn)
    } else if (ch === '"' || ch === "'") {
      let value = ''
      while (index < source.length && source[index] !== ch) value += read()
      read()
      add(TokenKind.String, value, startLine, startColumn)
    } else if (alpha(ch)) {
      let value = ch
      while (alpha(source[index]) || digit(source[index])) value += read()
      const keyword = keywords[value]
      add(keyword ?? TokenKind.Identifier, keyword ? null : value, startLine, startColumn)
    } else {
      const operator = operators[ch]
      if (operator || '(){};,'.includes(ch)) add(operator ?? ch, null, startLine, startColumn)
    }
  }
  return tokens
}
