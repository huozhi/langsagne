let i = 0
let str = ''

export const Source = {
  get index() { return i },
  get val() { return str[i] },

  read: () => str[i++],
  next: () => str[++i],
  at: (idx: number) => str[idx],
  peek: () => str[i + 1],
  eof: () => i === str.length,
  initialize(text: string) { str = text; i = 0 },
}

export default Source
