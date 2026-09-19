import { parse, tokenize, trace } from '../src/index.ts'
import { Directive } from '../src/runtime/directive.ts'

export function compile(code: string) {
  const program = parse(tokenize(code))
  return {
    constants: { Directive },
    VM: {
      directives: () => program.directives,
      trace: () => trace(program),
    },
  }
}
