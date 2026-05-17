import Context from './context.ts'
import Source from './source.ts'
import SymbolTable from './symbol-table.ts'
import { TokenKind } from './token-kind.ts'

function isDigit(chr: string | undefined) {
  return chr != null && chr >= '0' && chr <= '9'
}

function isAlpha(chr: string | undefined) {
  return chr != null && ((chr >= 'a' && chr <= 'z') || (chr >= 'A' && chr <= 'Z'))
}

export function next(_expected?: string | number) {
  while (!Source.eof()) {
    const ch = Source.read()
    // console.log('ch [', ch, ']')
    if (isDigit(ch)) {
      let value = (+ch)
      while (isDigit(Source.val)) {
        value = value * 10 + (+Source.read())
      }
      Context.value = value
      Context.token = TokenKind.Number

      return
    } else if (isAlpha(ch) || ch === '_') {
      let ident = ch
      while (isAlpha(Source.val) || Source.val === '_' || isDigit(Source.val)) {
        // console.log('isAlpha', Source.val, isAlpha(Source.val))
        ident += Source.read()
      }
      // console.log('ident', ident, Context.token, TokenKind.While)
      if (ident === 'while') Context.token = TokenKind.While
      else if (ident === 'if') Context.token = TokenKind.If
      else if (ident === 'else') Context.token = TokenKind.Else
      else if (ident === 'fn') Context.token = TokenKind.Function
      else if (ident === 'return') Context.token = TokenKind.Return
      else {
        Context.token = TokenKind.Identifier
        Context.value = ident

        SymbolTable.insert(ident, {type: TokenKind.Identifier, class: TokenKind.Global})
      }
      return
    }
    else if (ch === '+') { Context.token = TokenKind.Add; return }
    else if (ch === '-') { Context.token = TokenKind.Subtract; return }
    else if (ch === '*') { Context.token = TokenKind.Multiply; return }
    else if (ch === '/') { Context.token = TokenKind.Divide; return }
    else if (ch === '=') { Context.token = TokenKind.Assign; return }
    else if (ch === '<') { Context.token = TokenKind.LessThan; return }
    else if (ch === '(' || ch === ')' || ch === '{' || ch === '}' || ch === ';') { Context.token = ch; return }
  }
}

export default next
