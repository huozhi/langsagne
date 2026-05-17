import { Directive, type DirectiveName } from './directive.ts'
import { Store, type RuntimeValue } from './storage.ts'

export type DirectiveItem = DirectiveName | RuntimeValue

type VmSnapshot = {
  pc: number
  ax: RuntimeValue
  vs: RuntimeValue[]
  env: Record<string, RuntimeValue>
}

export type VmTraceStep = {
  pc: number
  op: DirectiveItem
  operands: DirectiveItem[]
  before: VmSnapshot
  after: VmSnapshot
}

const directiveOperands: Partial<Record<DirectiveName, number>> = {
  [Directive.CONST]: 1,
  [Directive.LOAD]: 1,
  [Directive.STORE]: 1,
  [Directive.JMP]: 1,
  [Directive.BZ]: 1,
}

function numberValue(value: RuntimeValue) {
  return Number(value)
}

function popNumber() {
  return numberValue(Store.vs.pop())
}

function snapshot(pc = Store.pc): VmSnapshot {
  return {
    pc,
    ax: Store.ax,
    vs: [...Store.vs],
    env: Object.fromEntries(Store.env),
  }
}

function execute(text: DirectiveItem[], shouldTrace: boolean) {
  Store.pc = 0
  const trace: VmTraceStep[] = []

  let op
  while (true) {
    const pc = Store.pc
    const before = snapshot(pc)
    op = text[Store.pc++]

    if (op == null) break

    const operandCount = typeof op === 'string' ? directiveOperands[op as DirectiveName] ?? 0 : 0
    const operands = text.slice(Store.pc, Store.pc + operandCount)

    if (op === Directive.CONST) { Store.ax = text[Store.pc++] }
    else if (op === Directive.LOAD) {
      Store.ax = Store.env.get(String(text[Store.pc++]))
    }
    else if (op === Directive.STORE) {
      Store.env.set(String(text[Store.pc++]), Store.ax)
    }
    else if (op === Directive.PUSH) { Store.vs.push(Store.ax) }
    else if (op === Directive.JMP) {
      Store.pc = Number(text[Store.pc])
    }
    else if (op === Directive.BZ) {
      const target = Number(text[Store.pc++])
      if (!Store.ax) Store.pc = target
    }

    else if (op === Directive.ADD) { Store.ax = popNumber() + numberValue(Store.ax) }
    else if (op === Directive.SUB) { Store.ax = popNumber() - numberValue(Store.ax) }
    else if (op === Directive.MUL) { Store.ax = popNumber() * numberValue(Store.ax) }
    else if (op === Directive.DIV) { Store.ax = popNumber() / numberValue(Store.ax) }
    else if (op === Directive.LT) { Store.ax = popNumber() < numberValue(Store.ax) ? 1 : 0 }
    else if (op === Directive.PRINT) { console.log(Store.ax) }
    else if (op === Directive.EXIT) {
      if (shouldTrace) trace.push({ pc, op, operands, before, after: snapshot() })
      break
    }
    else {
      break
    }

    if (shouldTrace) trace.push({ pc, op, operands, before, after: snapshot() })
  }

  return trace
}

let directiveItems: DirectiveItem[] = []

export const VM = {
  directives: () => Object.freeze(directiveItems),
  emit: (...items: DirectiveItem[]) => { directiveItems.push(...items) },
  emitAll: (items: DirectiveItem[]) => { directiveItems.push(...items) },
  execute: () => execute(directiveItems, false),
  patch: (index: number, value: DirectiveItem) => { directiveItems[index] = value },
  pop: () => directiveItems.pop(),
  position: () => directiveItems.length,
  reset: () => { directiveItems = [] },
  trace: () => execute(directiveItems, true),
}
