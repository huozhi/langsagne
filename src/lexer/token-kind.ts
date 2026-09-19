const tokenKindLabels = new Map<number, string>()

export const TokenKind = {
  Number: 1,
  Identifier: 2,
  String: 3,
  Else: 4,
  If: 5,
  Function: 6,
  Return: 7,
  While: 8,
  Assign: 9,
  LessThan: 10,
  Add: 11,
  Subtract: 12,
  Multiply: 13,
  Divide: 14,

  label(value: number) {
    return tokenKindLabels.get(value)
  },
}

// Higher precedence binds more tightly; these values are independent of token IDs.
export const Precedence = {
  Assignment: 1,
  Comparison: 2,
  Sum: 3,
  Product: 4,
} as const

for (const [name, value] of Object.entries(TokenKind)) {
  if (typeof value === 'number') tokenKindLabels.set(value, name)
}
