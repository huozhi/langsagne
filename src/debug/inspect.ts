import { parse } from '../parse.ts'
import { TokenKind } from '../lexer/token-kind.ts'
import { tokenize } from '../tokenize.ts'
import { trace } from '../trace.ts'
import type { RuntimeValue, DirectiveItem, VmTraceStep } from '../types.ts'

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

export function inspect(code: string): InspectResult {
  const tokens = tokenize(code)
  const program = parse(tokens)
  const steps = trace(program)
  const last = steps.at(-1)?.after

  return {
    directives: program.directives,
    env: last?.env ?? {},
    result: last ? last.ax : 0,
    tokens: tokens.map(token => ({
      label: tokenLabel(token.kind), value: token.value,
      line: token.line, column: token.column, length: token.length,
    })),
    trace: steps,
  }
}
