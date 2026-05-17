/*
 * Symbol structure
 * {
 *   type: ident | ...
 *   class: global | local | function | ...
 * }
 *
 */

type SymbolAttributes = {
  type: number
  class: number
}

const symbols = new Map<string, SymbolAttributes>()
let currSymbol: SymbolAttributes | null = null

export const SymbolTable = {
  find(ident: string) {
    return symbols.has(ident) ? symbols.get(ident) : null
  },

  insert(ident: string, attributes: SymbolAttributes) {
    if (!this.find(ident)) {
      symbols.set(ident, attributes)
    }

    return (currSymbol = symbols.get(ident) ?? null)
  },

  current() {
    return currSymbol
  },

  reset() {
    symbols.clear()
    currSymbol = null
  }
}

export default SymbolTable
