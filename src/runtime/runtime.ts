import { Source } from '../lexer/source.ts'
import { SymbolTable } from '../lexer/symbol-table.ts'
import { TokenState } from '../lexer/token-state.ts'
import { Store } from './storage.ts'
import { VM } from './vm.ts'

export function resetRuntime(code = '') {
  TokenState.reset()
  Store.reset()
  SymbolTable.reset()
  VM.reset()
  Source.initialize(code)
}
