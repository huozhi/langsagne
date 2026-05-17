import { parse } from '../compiler/parse.ts'
import { Source } from '../lexer/source.ts'
import { TokenKind } from '../lexer/token-kind.ts'
import { next } from '../lexer/tokenize.ts'
import { resetRuntime } from '../runtime/runtime.ts'
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
  result: RuntimeValue
  tokens: InspectToken[]
  trace: VmTraceStep[]
}

function tokenLabel(token: string | number | null) {
  if (typeof token === 'number') return TokenKind.label(token) ?? String(token)
  if (token === null) return 'EOF'
  return token
}

function scanTokens(code: string) {
  resetRuntime(code)
  const tokens: InspectToken[] = []

  while (!Source.eof()) {
    const state = next()
    if (state.token !== null) {
      tokens.push({
        label: tokenLabel(state.token),
        value: state.value,
        line: state.startLine,
        column: state.startColumn,
        length: state.length,
      })
    }
  }

  return tokens
}

export function inspect(code: string): InspectResult {
  const tokens = scanTokens(code)

  resetRuntime(code)
  parse()
  const trace = VM.trace()

  return {
    directives: VM.directives(),
    env: Object.fromEntries(Store.env),
    result: Store.ax,
    tokens,
    trace,
  }
}
