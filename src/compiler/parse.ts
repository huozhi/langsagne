import { Source, TokenState } from '../lexer/tokenize.ts'
import { Precedence, TokenKind } from '../lexer/token-kind.ts'
import { next } from '../lexer/tokenize.ts'
import { Directive, type DirectiveName } from '../runtime/directive.ts'
import { VM } from '../runtime/vm.ts'
import { error } from '../error.ts'

// Keep source-line debug metadata attached to each emitted directive.
function emit(...items: Parameters<typeof VM.emit>) {
  VM.mark(TokenState.startLine, TokenState.startColumn, TokenState.length)
  VM.emit(...items)
}

function expect(expected: string | number) {
  if (TokenState.token !== expected) {
    const actual = typeof TokenState.token === 'number' ? TokenKind.label(TokenState.token) : TokenState.token
    error('PARSE', `expected ${expected} but get ${actual}`)
  }
}

function token() {
  return TokenState.token
}

const binary: Record<number, [precedence: number, op: DirectiveName]> = {
  [TokenKind.LessThan]: [Precedence.Comparison, Directive.LT],
  [TokenKind.Add]: [Precedence.Sum, Directive.ADD],
  [TokenKind.Subtract]: [Precedence.Sum, Directive.SUB],
  [TokenKind.Multiply]: [Precedence.Product, Directive.MUL],
  [TokenKind.Divide]: [Precedence.Product, Directive.DIV],
}

// expr: NUMBER
// | STRING
// | OP expr
// | ( expr )
// | ident
// | ident '(' [expr [',' expr]*] ')'
// block      : '{' {statement ';'} '}'
// statement  : 'if' expr block ['else' block]
//            | 'while' expr block
//            | 'return' [expr]
//            | 'fn' ident '(' [ident [',' ident]*] ')' block
//            | expr
//            | ident = expr
// program    : [statement ';']

function param() {
  expect(TokenKind.Identifier)
  const name = String(TokenState.value)
  next()
  return name
}

function paramList() {
  const params: string[] = []

  expect('(')
  next()
  if (TokenState.token !== ')') {
    params.push(param())

    while (TokenState.token === ',') {
      next()
      params.push(param())
    }
  }
  expect(')')
  next()

  return params
}

function argList() {
  let argc = 0

  expect('(')
  next()
  if (TokenState.token !== ')') {
    expr()
    argc += 1

    while (TokenState.token === ',') {
      next()
      emit(Directive.PUSH)
      expr()
      argc += 1
    }
  }
  expect(')')
  next()

  if (argc > 0) {
    emit(Directive.PUSH)
  }

  return argc
}

function emptyArgList() {
  expect('(')
  next()
  expect(')')
  next()
}

function fnDecl() {
  expect(TokenKind.Function)
  next()
  if (TokenState.token !== TokenKind.Identifier) error('PARSE', 'expected function name')
  const name = String(TokenState.value)
  next()

  const params = paramList()

  emit(Directive.JMP)
  const skipTarget = VM.position()
  emit(null)

  const fnStart = VM.position()
  VM.registerFn(name, params, fnStart)

  block()

  VM.patch(skipTarget, VM.position())
}

function statement() {
  if (!TokenState.token && !Source.eof()) next()

  if (!Source.eof() && TokenState.token === TokenKind.If) {
    next()
    expect('(')
    next()
    expr()
    expect(')')
    next()
    emit(Directive.BZ)
    const elseTarget = VM.position()
    emit(null)
    block()

    if (TokenState.token === TokenKind.Else) {
      emit(Directive.JMP)
      const endTarget = VM.position()
      emit(null)
      VM.patch(elseTarget, VM.position())
      next()
      block()
      VM.patch(endTarget, VM.position())
    } else {
      VM.patch(elseTarget, VM.position())
    }
  } else if (!Source.eof() && TokenState.token === TokenKind.While) {
    next()
    expect('(')
    next()
    const loopStart = VM.position()
    expr()
    expect(')')
    next()
    emit(Directive.BZ)
    const exitTarget = VM.position()
    emit(null)
    block()
    emit(Directive.JMP, loopStart)
    VM.patch(exitTarget, VM.position())
  } else if (TokenState.token === TokenKind.Return) {
    next()
    if (token() !== ';' && token() !== '}') {
      expr()
    }
    emit(Directive.RET)
    if (token() === ';') { next() }
  } else if (TokenState.token === '{') {
    block()
  } else if (TokenState.token === ';') {
    next() // // empty statement
  } else {
    expr()
    if (TokenState.token === ';') { next() } else { error('PARSE', `expected ; but get ${TokenKind.label(TokenState.token as number)}`) }
  }
}

function block() {
  expect('{')
  next()
  while (!Source.eof() && TokenState.token !== '}') {
    statement()
  }
  expect('}')
  next()
}

function expr(minPrecedence = Precedence.Assignment) {
  if (Source.eof()) return
  // console.log('Source.val', Source.val)
  if (TokenState.token === TokenKind.Number) {
    // console.log('push value', TokenState.value)
    emit(Directive.CONST, TokenState.value)
    next()
  } else if (TokenState.token === TokenKind.String) {
    emit(Directive.CONST, TokenState.value)
    next()
  } else if (TokenState.token === '(') {
    expect('(')
    next()
    expr()
    expect(')')
    next()
  } else if (TokenState.token === TokenKind.Identifier) {
    const ident = String(TokenState.value)
    next() // Ident
    if ((TokenState.token as string | number | null) === '(') {
      if (ident === 'print') {
        const argc = argList()
        emit(Directive.PRINT, argc)
      } else if (ident === 'assert') {
        expect('(')
        next()
        expr()
        expect(')')
        next()
        emit(Directive.ASSERT)
      } else if (ident === 'clock') {
        emptyArgList()
        emit(Directive.CLOCK)
      } else {
        const argc = argList()
        emit(Directive.CALL, ident, argc)
      }
    } else {
      emit(Directive.LOAD, ident)
    }
  }

  while (true) {
    const operation = binary[TokenState.token as number]
    if (operation && operation[0] >= minPrecedence) {
      next()
      emit(Directive.PUSH)
      expr(operation[0] + 1)
      emit(operation[1])
    } else if (TokenState.token === TokenKind.Assign && minPrecedence <= Precedence.Assignment) {
      next()
      const target = VM.pop()
      const load = VM.pop()
      if (load !== Directive.LOAD || typeof target !== 'string') {
        error('PARSE', 'bad lvalue in assignment')
      }
      expr(Precedence.Assignment)
      emit(Directive.STORE, target)
    } else break
  }
}

export function parse() {
  emit(Directive.JMP)
  const mainTarget = VM.position()
  emit(null)

  let mainStart: number | null = null

  while (!Source.eof()) {
    if (!TokenState.token) next()
    if (TokenState.token === TokenKind.Function) {
      fnDecl()
    } else {
      if (mainStart === null) mainStart = VM.position()
      statement()
    }
  }

  if (mainStart === null) mainStart = VM.position()
  VM.patch(mainTarget, mainStart)
}
