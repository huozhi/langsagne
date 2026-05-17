let i = 0
let str = ''

export const Source = {
  get val() { return str[i] },

  read: () => str[i++],
  eof: () => i === str.length,
  initialize(text: string) { str = text; i = 0 },
}
