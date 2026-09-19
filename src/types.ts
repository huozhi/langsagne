import type { DirectiveName } from './runtime/directive.ts'

export type RuntimeValue = string | number | null | undefined
export type DirectiveItem = DirectiveName | RuntimeValue

export type SourceSite = { line: number; column: number; length: number }
export type Token = SourceSite & { kind: string | number; value: string | number | null }
export type FnDef = { entry: number; params: string[] }

export type Program = {
  directives: DirectiveItem[]
  sites: Map<number, SourceSite>
  functions: Map<string, FnDef>
}

export type VmSnapshot = {
  pc: number
  ax: RuntimeValue
  vs: RuntimeValue[]
  env: Record<string, RuntimeValue>
}

export type VmTraceStep = {
  pc: number
  op: DirectiveItem
  operands: DirectiveItem[]
  sourceLine: number | null
  sourceColumn: number | null
  sourceLength: number | null
  before: VmSnapshot
  after: VmSnapshot
}
