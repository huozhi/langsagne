export const TokenState: {
  token: string | number | null
  value: string | number | null
  startLine: number
  startColumn: number
  length: number
  reset: () => void
} = {
  token: null,
  value: null,
  startLine: 1,
  startColumn: 1,
  length: 0,
  reset() {
    TokenState.token = null
    TokenState.value = null
    TokenState.startLine = 1
    TokenState.startColumn = 1
    TokenState.length = 0
  },
}
