type TokenKindMap = Record<string, number> & {
  label(value: number): string | undefined
}

const defineTokenKinds = (keys: string[], start = 1): TokenKindMap => {
  const tokenKinds = keys.reduce((tokens, key) => {
    tokens[key] = start++
    return tokens
  }, {} as TokenKindMap)

  Object.defineProperty(tokenKinds, 'label', {
    value: (value: number) => Object.keys(tokenKinds).find(key => tokenKinds[key] === value),
  })

  return tokenKinds
}

export const TokenKind = defineTokenKinds([
  'Number', 'Global', 'Identifier', 'String',
  'Else', 'If', 'Function', 'Return', 'While',
  'Assign', 'LessThan', 'Add', 'Subtract', 'Multiply', 'Divide',
])
