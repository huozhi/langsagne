type StringEnum = Record<string, string>

const defineOpCodes = (keys: string[]): StringEnum => keys.reduce((opcodes, key) => {
  opcodes[key] = key
  return opcodes
}, {} as StringEnum)

export const OpCode = defineOpCodes([
  'CONST', 'LOAD', 'STORE', 'PUSH',
  'JMP', 'BZ',
  'ADD', 'SUB', 'MUL', 'DIV', 'LT',
  'EXIT',
])
