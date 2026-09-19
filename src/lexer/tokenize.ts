import { TokenKind } from './token-kind.ts'

let source = ''
let index = 0
let line = 1
let column = 1

export const Source = {
  get line() { return line },
  get column() { return column },
  get val() { return source[index] },
  eof: () => index >= source.length,
  read() {
    const ch = source[index++]
    if (ch === '\n') { line++; column = 1 } else column++
    return ch
  },
  initialize(text: string) { source = text; index = 0; line = 1; column = 1 },
}

export const TokenState = {
  token: null as string | number | null,
  value: null as string | number | null,
  startLine: 1,
  startColumn: 1,
  length: 0,
  reset() { this.token = null; this.value = null; this.startLine = 1; this.startColumn = 1; this.length = 0 },
}

const operators: Record<string, number> = {
  '+': TokenKind.Add, '-': TokenKind.Subtract, '*': TokenKind.Multiply,
  '/': TokenKind.Divide, '=': TokenKind.Assign, '<': TokenKind.LessThan,
}

function isDigit(chr: string | undefined) {
  return chr != null && chr >= '0' && chr <= '9'
}

function isAlpha(chr: string | undefined) {
  return chr != null && ((chr >= 'a' && chr <= 'z') || (chr >= 'A' && chr <= 'Z'))
}

function setToken(token: string | number, value: string | number | null = null) {
  TokenState.token = token
  TokenState.value = value
}

function finishToken(startLine: number, startColumn: number) {
  TokenState.startLine = startLine
  TokenState.startColumn = startColumn
  TokenState.length = Math.max(1, Source.column - startColumn)
}

export function next() {
  while (!Source.eof()) {
    const startLine = Source.line
    const startColumn = Source.column
    const ch = Source.read()

    if (isDigit(ch)) {
      let value = (+ch)
      while (isDigit(Source.val)) {
        value = value * 10 + (+Source.read())
      }
      setToken(TokenKind.Number, value)
      finishToken(startLine, startColumn)
      return TokenState
    }

    if (ch === '"' || ch === "'") {
      let value = ''
      while (!Source.eof() && Source.val !== ch) {
        value += Source.read()
      }
      Source.read()
      setToken(TokenKind.String, value)
      finishToken(startLine, startColumn)
      return TokenState
    }

    if (isAlpha(ch) || ch === '_') {
      let ident = ch
      while (isAlpha(Source.val) || Source.val === '_' || isDigit(Source.val)) {
        ident += Source.read()
      }
      if (ident === 'while') setToken(TokenKind.While)
      else if (ident === 'if') setToken(TokenKind.If)
      else if (ident === 'else') setToken(TokenKind.Else)
      else if (ident === 'fn') setToken(TokenKind.Function)
      else if (ident === 'return') setToken(TokenKind.Return)
      else setToken(TokenKind.Identifier, ident)
      finishToken(startLine, startColumn)
      return TokenState
    }

    const operator = operators[ch ?? '']
    if (operator || '(){};,'.includes(ch ?? '')) {
      setToken(operator ?? ch)
      finishToken(startLine, startColumn)
      return TokenState
    }
  }

  return TokenState
}
