const tokenKindLabels = new Map<number, string>()

export const TokenKind = {
  Number: 1,
  Global: 2,
  Identifier: 3,
  String: 4,
  Else: 5,
  If: 6,
  Function: 7,
  Return: 8,
  While: 9,
  Assign: 10,
  LessThan: 11,
  Add: 12,
  Subtract: 13,
  Multiply: 14,
  Divide: 15,

  label(value: number) {
    return tokenKindLabels.get(value)
  },
}

for (const [name, value] of Object.entries(TokenKind)) {
  if (typeof value === 'number') tokenKindLabels.set(value, name)
}
