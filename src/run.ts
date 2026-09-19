import { Directive, type DirectiveName } from './runtime/directive.ts'
import { error } from './error.ts'
import type { Program, RuntimeValue, VmSnapshot, VmTraceStep } from './types.ts'

const operandCount: Partial<Record<DirectiveName, number>> = {
  CONST: 1, LOAD: 1, STORE: 1, JMP: 1, BZ: 1, CALL: 2, PRINT: 1,
}

export function run(program: Program, onStep?: (step: VmTraceStep) => void): RuntimeValue {
  const { directives: code, sites, functions } = program
  const env = new Map<string, RuntimeValue>()
  const stack: RuntimeValue[] = []
  const calls: { ret: number; locals: Map<string, RuntimeValue> }[] = []
  let ax: RuntimeValue = 0
  let pc = 0
  const frame = () => calls.at(-1)
  const popNumber = () => Number(stack.pop())
  const snapshot = (): VmSnapshot => ({
    pc, ax, vs: [...stack], env: { ...Object.fromEntries(env), ...Object.fromEntries(frame()?.locals ?? []) },
  })

  while (true) {
    const at = pc
    const before = onStep ? snapshot() : undefined
    const op = code[pc++]
    if (op == null) break
    const operands = onStep ? code.slice(pc, pc + (operandCount[op as DirectiveName] ?? 0)) : []
    const line = sites.get(at)?.line ?? null

    if (op === Directive.CONST) ax = code[pc++]
    else if (op === Directive.LOAD) {
      const name = String(code[pc++])
      ax = frame()?.locals.has(name) ? frame()!.locals.get(name) : env.get(name)
    } else if (op === Directive.STORE) {
      const name = String(code[pc++])
      if (frame()) frame()!.locals.set(name, ax)
      else env.set(name, ax)
    } else if (op === Directive.PUSH) stack.push(ax)
    else if (op === Directive.JMP) pc = Number(code[pc])
    else if (op === Directive.BZ) {
      const target = Number(code[pc++])
      if (!ax) pc = target
    } else if (op === Directive.ADD) ax = popNumber() + Number(ax)
    else if (op === Directive.SUB) ax = popNumber() - Number(ax)
    else if (op === Directive.MUL) ax = popNumber() * Number(ax)
    else if (op === Directive.DIV) ax = popNumber() / Number(ax)
    else if (op === Directive.LT) ax = popNumber() < Number(ax) ? 1 : 0
    else if (op === Directive.PRINT) {
      const count = Number(code[pc++])
      console.log(...(count ? stack.splice(-count, count) : []))
    } else if (op === Directive.ASSERT) {
      if (!ax) error('RUNTIME', 'assert failed', line)
    } else if (op === Directive.CLOCK) ax = Date.now()
    else if (op === Directive.CALL) {
      const name = String(code[pc++])
      const count = Number(code[pc++])
      const fn = functions.get(name) ?? error('RUNTIME', `unknown function ${name}`, line)
      if (count !== fn.params.length) error('RUNTIME', `${name} expected ${fn.params.length} args but got ${count}`, line)
      const locals = new Map<string, RuntimeValue>()
      for (let i = fn.params.length - 1; i >= 0; i--) locals.set(fn.params[i], stack.pop())
      calls.push({ ret: pc, locals })
      pc = fn.entry
    } else if (op === Directive.RET) {
      pc = (calls.pop() ?? error('RUNTIME', 'RET without call frame', line)).ret
    } else if (op !== Directive.EXIT) break

    if (onStep) {
      const site = sites.get(at)
      onStep({
        pc: at, op, operands,
        sourceLine: site?.line ?? null,
        sourceColumn: site?.column ?? null,
        sourceLength: site?.length ?? null,
        before: before!, after: snapshot(),
      })
    }
    if (op === Directive.EXIT) break
  }
  return ax
}
