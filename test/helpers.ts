import parse from '../src/compiler/parse.ts'
import Context from '../src/lexer/context.ts'
import Source from '../src/lexer/source.ts'
import SymbolTable from '../src/lexer/symbol-table.ts'
import { TokenKind } from '../src/lexer/token-kind.ts'
import next from '../src/lexer/tokenize.ts'
import { OpCode } from '../src/runtime/op-code.ts'
import { resetRuntime } from '../src/runtime/runtime.ts'
import { Store } from '../src/runtime/storage.ts'
import VM from '../src/runtime/vm.ts'

export function freshRuntime() {
  resetRuntime()

  return {
    constants: { OpCode, TokenKind },
    Context,
    parse,
    Source,
    storage: { Store },
    SymbolTable,
    next,
    VM,
  }
}

export function compile(sourceText: string) {
  const runtime = freshRuntime()

  runtime.Source.initialize(sourceText)
  runtime.parse()

  return runtime
}
