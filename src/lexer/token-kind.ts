const tokenKindLabels = new Map<number, string>()

export const TokenKind = {
  Number: 1,
  Identifier: 2,
  Else: 3,
  If: 4,
  Function: 5,
  Return: 6,
  While: 7,
  Assign: 8,
  LessThan: 9,
  Add: 10,
  Subtract: 11,
  Multiply: 12,
  Divide: 13,

  label(value: number) {
    return tokenKindLabels.get(value)
  },
}

for (const [name, value] of Object.entries(TokenKind)) {
  if (typeof value === 'number') tokenKindLabels.set(value, name)
}
