export type RuntimeValue = string | number | null | undefined

type StoreState = {
  ax: RuntimeValue
  pc: number
  vs: RuntimeValue[]
  env: Map<string, RuntimeValue>
  reset: () => void
}

export const Store: StoreState = {
  ax: 0, // accumulator
  pc: 0, // program counter
  vs: [], // value stack
  env: new Map(), // runtime environment: name -> value
  reset() {
    this.ax = 0
    this.pc = 0
    this.vs = []
    this.env = new Map()
  },
}
