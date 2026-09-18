let index = 0
let line = 1
let column = 1
let source = ''

export const TokenState: {
  token: string | number | null
  value: string | number | null
  startLine: number
  startColumn: number
  length: number
  readonly line: number
  readonly column: number
  readonly val: string | undefined
  readonly valueAtCursor: string | undefined
  read: () => string | undefined
  eof: () => boolean
  initialize: (text: string) => void
  reset: () => void
} = {
  token: null,
  value: null,
  startLine: 1,
  startColumn: 1,
  length: 0,
  get line() { return line },
  get column() { return column },
  get val() { return source[index] },
  get valueAtCursor() { return source[index] },
  read() {
    const ch = source[index++]
    if (ch === '\n') {
      line += 1
      column = 1
    } else {
      column += 1
    }
    return ch
  },
  eof: () => index === source.length,
  initialize(text: string) {
    source = text
    index = 0
    line = 1
    column = 1
  },
  reset() {
    TokenState.token = null
    TokenState.value = null
    TokenState.startLine = 1
    TokenState.startColumn = 1
    TokenState.length = 0
  },
}
