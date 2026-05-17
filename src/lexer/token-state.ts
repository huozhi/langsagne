export const TokenState: {
  token: string | number | null
  value: string | number | null
  reset: () => void
} = {
  token: null,
  value: null,
  reset() {
    TokenState.token = null
    TokenState.value = null
  },
}
