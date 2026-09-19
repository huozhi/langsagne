import { Precedence, TokenKind } from './lexer/token-kind.ts'
import { Directive, type DirectiveName } from './runtime/directive.ts'
import { error } from './error.ts'
import type { DirectiveItem, Program, Token } from './types.ts'

const binary: Record<number, [precedence: number, op: DirectiveName]> = {
  [TokenKind.LessThan]: [Precedence.Comparison, Directive.LT],
  [TokenKind.Add]: [Precedence.Sum, Directive.ADD],
  [TokenKind.Subtract]: [Precedence.Sum, Directive.SUB],
  [TokenKind.Multiply]: [Precedence.Product, Directive.MUL],
  [TokenKind.Divide]: [Precedence.Product, Directive.DIV],
}

export function parse(tokens: Token[]): Program {
  const program: Program = { directives: [], sites: new Map(), functions: new Map() }
  const code = program.directives
  let index = 0
  const current = () => tokens[index]
  const kind = () => current()?.kind
  const advance = () => tokens[index++]
  const position = () => code.length
  const patch = (at: number) => { code[at] = position() }
  const emit = (...items: DirectiveItem[]) => {
    const token = current() ?? tokens.at(-1)
    if (token) program.sites.set(position(), { line: token.line, column: token.column, length: token.length })
    code.push(...items)
  }
  const expect = (wanted: string | number) => {
    if (kind() !== wanted) error('PARSE', `expected ${wanted} but get ${String(kind() ?? 'EOF')}`)
    return advance()
  }

  const params = () => {
    const names: string[] = []
    expect('(')
    if (kind() !== ')') {
      names.push(String(expect(TokenKind.Identifier).value))
      while (kind() === ',') { advance(); names.push(String(expect(TokenKind.Identifier).value)) }
    }
    expect(')')
    return names
  }

  const args = () => {
    let count = 0
    expect('(')
    if (kind() !== ')') {
      expression(); count++
      while (kind() === ',') { advance(); emit(Directive.PUSH); expression(); count++ }
    }
    expect(')')
    if (count) emit(Directive.PUSH)
    return count
  }

  const expression = (minimum: number = Precedence.Assignment): void => {
    const token = current()
    if (!token) return
    if (token.kind === TokenKind.Number || token.kind === TokenKind.String) {
      emit(Directive.CONST, token.value)
      advance()
    } else if (token.kind === '(') {
      advance(); expression(); expect(')')
    } else if (token.kind === TokenKind.Identifier) {
      const name = String(advance().value)
      if (kind() !== '(') emit(Directive.LOAD, name)
      else if (name === 'assert') {
        advance(); expression(); expect(')'); emit(Directive.ASSERT)
      } else if (name === 'clock') {
        advance(); expect(')'); emit(Directive.CLOCK)
      } else {
        const count = args()
        if (name === 'print') emit(Directive.PRINT, count)
        else emit(Directive.CALL, name, count)
      }
    } else error('PARSE', `expected expression but get ${String(token.kind)}`)

    while (true) {
      const operation = binary[kind() as number]
      if (operation && operation[0] >= minimum) {
        advance(); emit(Directive.PUSH); expression(operation[0] + 1); emit(operation[1])
      } else if (kind() === TokenKind.Assign && minimum <= Precedence.Assignment) {
        advance()
        const target = code.pop()
        if (code.pop() !== Directive.LOAD || typeof target !== 'string') error('PARSE', 'bad lvalue in assignment')
        expression(Precedence.Assignment)
        emit(Directive.STORE, target)
      } else break
    }
  }

  const block = () => {
    expect('{')
    while (current() && kind() !== '}') statement()
    expect('}')
  }

  const statement = (): void => {
    if (kind() === TokenKind.If) {
      advance(); expect('('); expression(); expect(')')
      emit(Directive.BZ); const otherwise = position(); emit(null); block()
      if (kind() === TokenKind.Else) {
        emit(Directive.JMP); const end = position(); emit(null)
        patch(otherwise); advance(); block(); patch(end)
      } else patch(otherwise)
    } else if (kind() === TokenKind.While) {
      advance(); expect('('); const start = position(); expression(); expect(')')
      emit(Directive.BZ); const end = position(); emit(null)
      block(); emit(Directive.JMP, start); patch(end)
    } else if (kind() === TokenKind.Return) {
      advance()
      if (kind() !== ';' && kind() !== '}') expression()
      emit(Directive.RET)
      if (kind() === ';') advance()
    } else if (kind() === '{') block()
    else if (kind() === ';') advance()
    else { expression(); expect(';') }
  }

  emit(Directive.JMP); const mainTarget = position(); emit(null)
  let mainStart: number | null = null
  while (current()) {
    if (kind() === TokenKind.Function) {
      advance()
      const name = String(expect(TokenKind.Identifier).value)
      const parameters = params()
      emit(Directive.JMP); const skip = position(); emit(null)
      program.functions.set(name, { entry: position(), params: parameters })
      block(); patch(skip)
    } else {
      mainStart ??= position()
      statement()
    }
  }
  code[mainTarget] = mainStart ?? position()
  return program
}
