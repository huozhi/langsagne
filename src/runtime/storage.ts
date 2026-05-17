export const Store: {
  ax: any
  pc: number
  vs: any[]
  env: Map<string, any>
  reset: () => void
} = {
  ax: 0, // accumulator
  pc: 0, // program counter
  vs: [], // value stack
  env: new Map(), // runtime environment: name -> value
  reset() {
    Store.ax = 0
    Store.pc = 0
    Store.vs = []
    Store.env = new Map()
  },
}
