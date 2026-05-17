import { parse } from './compiler/parse.ts'
import { resetRuntime } from './runtime/runtime.ts'
import { Store } from './runtime/storage.ts'
import { VM } from './runtime/vm.ts'

export function execute(code: string) {
  resetRuntime(code)
  parse()
  VM.execute()

  return Store.ax
}
