export const Context: {
  // type: null, // TODO: type sys
  token: string | number | null
  value: string | number | null
} = {
  token: null,
  value: null,
}

export function resetContext() {
  Context.token = null
  Context.value = null
}

export default Context
