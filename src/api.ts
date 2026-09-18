import { TokenState } from './lexer/token-state.ts'
import { TokenKind } from './lexer/token-kind.ts'
import { next } from './lexer/tokenize.ts'
import { parse as compile } from './compiler/parse.ts'
import { Store } from './runtime/storage.ts'
import { Store } from './runtime/storage.ts'
import { VM, type DirectiveItem, type VmTraceStep } from './runtime/vm.ts'

function reset(code: string) {
  TokenState.reset()
  Store.reset()
  VM.reset()
  TokenState.initialize(code)
}

export type Token = {
  kind: string | number
  value: string | number | null
  line: number
  column: number
  length: number
}

export function tokenize(code: string): Token[] {
  reset(code)
  const tokens: Token[] = []
  while (!TokenState.eof()) {
    const token = next()
    if (token.token !== null) {
      tokens.push({
        kind: typeof token.token === 'number' ? TokenKind.label(token.token) ?? token.token : token.token,
        value: token.value,
        line: token.startLine,
        column: token.startColumn,
        length: token.length,
      })
    }
  }
  return tokens
}

export function parse(code: string): readonly DirectiveItem[] {
  reset(code)
  compile()
  return VM.directives()
}

export function run(code: string) {
  reset(code)
  compile()
  VM.execute()
  return Store.ax
}

export function trace(code: string): VmTraceStep[] {
  reset(code)
  compile()
  return VM.trace()
}
