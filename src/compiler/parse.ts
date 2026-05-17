import { Source } from '../lexer/source.ts'
import { TokenState } from '../lexer/token-state.ts'
import { TokenKind } from '../lexer/token-kind.ts'
import { next } from '../lexer/tokenize.ts'
import { Directive } from '../runtime/directive.ts'
import { VM } from '../runtime/vm.ts'

const error = (message: string) => { throw new Error('PARSE ERR: ' + message) }

function consume(expected: string | number) {
  if (TokenState.token !== expected) {
    const actual = typeof TokenState.token === 'number' ? TokenKind.label(TokenState.token) : TokenState.token
    error(`expected ${expected} but get ${actual}`)
  }

  next()
}

// expr: NUMBER
// | OP expr
// | ( expr )
// block      : '{' {statement ';'} '}'
// statement  : 'if' expr block ['else' block]
//            | 'while' expr block
//            | expr
//            | ident = expr
// program    : [statement ';']

function statement() {
  if (!TokenState.token && !Source.eof()) next()

  if (!Source.eof() && TokenState.token === TokenKind.While) {
    next()
    consume('(')
    const loopStart = VM.position()
    expr(TokenKind.Assign)
    consume(')')
    VM.emit(Directive.BZ)
    const exitTarget = VM.position()
    VM.emit(null)
    block()
    VM.emit(Directive.JMP, loopStart)
    VM.patch(exitTarget, VM.position())
  } else if (TokenState.token === '{') {
    block()
  } else if (TokenState.token === ';') {
    next() // // empty statement
  } else {
    expr(TokenKind.Assign)
    if (TokenState.token === ';') { next() } else { error(`expected ; but get ${TokenKind.label(TokenState.token as number)}`) }
  }
}

function block() {
  consume('{')
  while (!Source.eof() && TokenState.token !== '}') {
    statement()
  }
  consume('}')
}

function expr(level = 0) {
  if (Source.eof()) return
  // console.log('Source.val', Source.val)
  if (TokenState.token === TokenKind.Number) {
    // console.log('push value', TokenState.value)
    VM.emit(Directive.CONST, TokenState.value)
    next()
  } else if (TokenState.token === '(') {
    consume('(')
    expr(TokenKind.Assign)
    consume(')')
  } else if (TokenState.token === TokenKind.Identifier) {
    const ident = String(TokenState.value)
    next() // Ident
    if ((TokenState.token as string | number | null) === '(') {
      if (ident !== 'print') error(`unsupported call ${ident}`)

      consume('(')
      expr(TokenKind.Assign)
      consume(')')
      VM.emit(Directive.PRINT)
    } else {
      VM.emit(Directive.LOAD, ident)
    }
  }

  while ((TokenState.token as number) >= level) {
    // console.log('level', level)
    if (TokenState.token === TokenKind.Add) { next(); VM.emit(Directive.PUSH); expr(TokenKind.Multiply); VM.emit(Directive.ADD) }
    else if (TokenState.token === TokenKind.Subtract) { next(); VM.emit(Directive.PUSH); expr(TokenKind.Multiply); VM.emit(Directive.SUB) }
    else if (TokenState.token === TokenKind.Multiply) { next(); VM.emit(Directive.PUSH); expr(TokenKind.Multiply + 1); VM.emit(Directive.MUL) }
    else if (TokenState.token === TokenKind.Divide) { next(); VM.emit(Directive.PUSH); expr(TokenKind.Multiply + 1); VM.emit(Directive.DIV) }
    else if (TokenState.token === TokenKind.LessThan) { next(); VM.emit(Directive.PUSH); expr(TokenKind.Add); VM.emit(Directive.LT) }
    else if (TokenState.token === ';') {
      next()
    }
    else if (TokenState.token === TokenKind.Assign) {
      next()
      const target = VM.pop()
      const load = VM.pop()
      if (load !== Directive.LOAD || typeof target !== 'string') {
        error('bad lvalue in assignment')
      }
      expr(TokenKind.Assign)
      VM.emit(Directive.STORE, target)
    }

    else { error('parsing fail ' + TokenState.token) }
  }
}

export function parse() {
  while (!Source.eof()) {
    statement()
  }
}
