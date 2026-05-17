import { parse } from '../src/compiler/parse.ts'
import { Source } from '../src/lexer/source.ts'
import { TokenState } from '../src/lexer/token-state.ts'
import { TokenKind } from '../src/lexer/token-kind.ts'
import { next } from '../src/lexer/tokenize.ts'
import { Directive } from '../src/runtime/directive.ts'
import { resetRuntime } from '../src/runtime/runtime.ts'
import { Store } from '../src/runtime/storage.ts'
import { VM } from '../src/runtime/vm.ts'

export function runtime(code: string) {
  resetRuntime(code)

  return {
    constants: { Directive, TokenKind },
    parse,
    Source,
    Store,
    TokenState,
    next,
    VM,
  }
}

export function compile(code: string) {
  const modules = runtime(code)
  modules.parse()

  return modules
}
