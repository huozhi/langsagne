import { Source, TokenState } from '../lexer/tokenize.ts'
import { Store } from './storage.ts'
import { VM } from './vm.ts'

export function resetRuntime(code: string) {
  TokenState.reset()
  Store.reset()
  VM.reset()
  Source.initialize(code)
}
