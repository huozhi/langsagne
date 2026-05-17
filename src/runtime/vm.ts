import { OpCode } from './op-code.ts'
import { Store } from './storage.ts'

type VmSnapshot = {
  pc: number
  ax: any
  vs: any[]
  env: Record<string, any>
}

export type VmTraceStep = {
  pc: number
  op: any
  operands: any[]
  before: VmSnapshot
  after: VmSnapshot
}

type ExecuteOptions = {
  trace?: boolean
}

const opcodeOperands: Record<string, number> = {
  [OpCode.CONST]: 1,
  [OpCode.LOAD]: 1,
  [OpCode.STORE]: 1,
  [OpCode.JMP]: 1,
  [OpCode.BZ]: 1,
}

function snapshot(pc = Store.pc): VmSnapshot {
  return {
    pc,
    ax: Store.ax,
    vs: [...Store.vs],
    env: Object.fromEntries(Store.env),
  }
}

function execute(text: any[], options: ExecuteOptions = {}) {
  Store.pc = 0
  const trace: VmTraceStep[] = []

  let op
  while (true) {
    const pc = Store.pc
    const before = snapshot(pc)
    op = text[Store.pc++]

    if (op == null) break

    const operandCount = opcodeOperands[op] ?? 0
    const operands = text.slice(Store.pc, Store.pc + operandCount)

    if (op === OpCode.CONST) { Store.ax = text[Store.pc++] }
    else if (op === OpCode.LOAD) {
      Store.ax = Store.env.get(text[Store.pc++])
    }
    else if (op === OpCode.STORE) {
      Store.env.set(text[Store.pc++], Store.ax)
    }
    else if (op === OpCode.PUSH) { Store.vs.push(Store.ax) }
    else if (op === OpCode.JMP) {
      Store.pc = text[Store.pc]
    }
    else if (op === OpCode.BZ) {
      const target = text[Store.pc++]
      if (!Store.ax) Store.pc = target
    }

    else if (op === OpCode.ADD) { Store.ax = Store.vs.pop() + Store.ax }
    else if (op === OpCode.SUB) { Store.ax = Store.vs.pop() - Store.ax }
    else if (op === OpCode.MUL) { Store.ax = Store.vs.pop() * Store.ax }
    else if (op === OpCode.DIV) { Store.ax = Store.vs.pop() / Store.ax }
    else if (op === OpCode.LT) { Store.ax = Store.vs.pop() < Store.ax ? 1 : 0 }
    else if (op === OpCode.EXIT) {
      if (options.trace) trace.push({ pc, op, operands, before, after: snapshot() })
      break
    }
    else {
      break
    }

    if (options.trace) trace.push({ pc, op, operands, before, after: snapshot() })
  }

  return trace
}

export const emitted: any[] = []

Object.defineProperty(emitted, 'top', {
  get: () => emitted[emitted.length - 1],
  set: (value) => { emitted[emitted.length - 1] = value }
})

export const VM = {
  emitted,
  execute: (options?: ExecuteOptions) => execute(VM.emitted, options),
  load: (commands: any[]) => VM.emitted.push(...commands),
  reset: () => { VM.emitted.length = 0 },
}

export default VM
