export const Directive = {
  CONST: 'CONST',
  LOAD: 'LOAD',
  STORE: 'STORE',
  PUSH: 'PUSH',
  JMP: 'JMP',
  BZ: 'BZ',
  ADD: 'ADD',
  SUB: 'SUB',
  MUL: 'MUL',
  DIV: 'DIV',
  LT: 'LT',
  PRINT: 'PRINT',
  EXIT: 'EXIT',
} as const

export type DirectiveName = typeof Directive[keyof typeof Directive]
