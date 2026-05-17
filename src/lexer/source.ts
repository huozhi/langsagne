let i = 0
let line = 1
let str = ''

export const Source = {
  get line() { return line },
  get val() { return str[i] },

  read() {
    const ch = str[i++]
    if (ch === '\n') line += 1
    return ch
  },
  eof: () => i === str.length,
  initialize(text: string) { str = text; i = 0; line = 1 },
}
