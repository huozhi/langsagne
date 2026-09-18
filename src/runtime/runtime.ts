import { Source } from '../lexer/source.ts'
import { TokenState } from '../lexer/token-state.ts'
import { Store } from './storage.ts'
import { VM } from './vm.ts'

export function resetRuntime(code: string) {
  TokenState.reset()
  Store.reset()
  VM.reset()
  Source.initialize(code)
}
