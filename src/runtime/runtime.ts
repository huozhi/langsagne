import { resetContext } from '../lexer/context.ts'
import Source from '../lexer/source.ts'
import SymbolTable from '../lexer/symbol-table.ts'
import { resetStore } from './storage.ts'
import VM from './vm.ts'

export function resetRuntime(sourceText = '') {
  resetContext()
  resetStore()
  SymbolTable.reset()
  VM.reset()
  Source.initialize(sourceText)
}
