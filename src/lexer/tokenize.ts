import { Source } from './source.ts'
import { TokenState } from './token-state.ts'
import { TokenKind } from './token-kind.ts'

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

    if (ch === '+') { setToken(TokenKind.Add); finishToken(startLine, startColumn); return TokenState }
    if (ch === '-') { setToken(TokenKind.Subtract); finishToken(startLine, startColumn); return TokenState }
    if (ch === '*') { setToken(TokenKind.Multiply); finishToken(startLine, startColumn); return TokenState }
    if (ch === '/') { setToken(TokenKind.Divide); finishToken(startLine, startColumn); return TokenState }
    if (ch === '=') { setToken(TokenKind.Assign); finishToken(startLine, startColumn); return TokenState }
    if (ch === '<') { setToken(TokenKind.LessThan); finishToken(startLine, startColumn); return TokenState }
    if (ch === '(' || ch === ')' || ch === '{' || ch === '}' || ch === ';' || ch === ',') {
      setToken(ch)
      finishToken(startLine, startColumn)
      return TokenState
    }
  }

  return TokenState
}
