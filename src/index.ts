import { tokenize } from './tokenize.ts'
import { parse } from './parse.ts'
import { run } from './run.ts'
export { tokenize, parse, run }
export { trace } from './trace.ts'
export { inspect } from './debug/inspect.ts'
export type { InspectResult, InspectToken } from './debug/inspect.ts'
export type { RuntimeValue, DirectiveItem, SourceSite, VmTraceStep, Token, Program } from './types.ts'

export function execute(code: string) {
  return run(parse(tokenize(code)))
}
