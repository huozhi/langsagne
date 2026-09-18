import { parse } from './compiler/parse.ts'
import { resetRuntime } from './runtime/runtime.ts'
import { Store } from './runtime/storage.ts'
import { VM } from './runtime/vm.ts'
export { inspect } from './debug/inspect.ts'
export type { InspectResult, InspectToken } from './debug/inspect.ts'
export type { RuntimeValue } from './runtime/storage.ts'
export type { DirectiveItem, SourceSite, VmTraceStep } from './runtime/vm.ts'

export function execute(code: string) {
  resetRuntime(code)
  parse()
  VM.execute()

  return Store.ax
}
