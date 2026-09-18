import { tokenize, trace } from '../api.ts'
import { Store, type RuntimeValue } from '../runtime/storage.ts'
import { VM, type DirectiveItem, type VmTraceStep } from '../runtime/vm.ts'

export type InspectToken = {
  label: string
  value: string | number | null
  line: number
  column: number
  length: number
}

export type InspectResult = {
  directives: readonly DirectiveItem[]
  env: Record<string, RuntimeValue>
  tokens: InspectToken[]
  trace: VmTraceStep[]
}

export function inspect(code: string): InspectResult {
  const tokens: InspectToken[] = tokenize(code).map(token => ({
    label: String(token.kind),
    value: token.value,
    line: token.line,
    column: token.column,
    length: token.length,
  }))

  const steps = trace(code)

  return {
    directives: VM.directives(),
    env: Object.fromEntries(Store.env),
    tokens,
    trace: steps,
  }
}
