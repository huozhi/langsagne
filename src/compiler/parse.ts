import { Source } from '../lexer/source.ts'
import { TokenState } from '../lexer/token-state.ts'
import { TokenKind } from '../lexer/token-kind.ts'
import { next } from '../lexer/tokenize.ts'
import { OpCode } from '../runtime/op-code.ts'
import { emitted } from '../runtime/vm.ts'

const error = (message = '') => { throw new Error('PARSE ERR: ' + message) }

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
    const loopStart = emitted.length
    expr(TokenKind.Assign)
    consume(')')
    emitted.push(OpCode.BZ)
    const exitTarget = emitted.length
    emitted.push(null)
    block()
    emitted.push(OpCode.JMP)
    emitted.push(loopStart)
    emitted[exitTarget] = emitted.length
  } else if (TokenState.token === '{') {
    block()
  } else if (TokenState.token === ';') {
    next() // // empty statement
  } else {
    expr(TokenKind.Assign)
    if (TokenState.token === ';') { next(';') } else { error(`expected ; but get ${TokenKind.label(TokenState.token as number)}`) }
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
    emitted.push(OpCode.CONST)
    emitted.push(TokenState.value)
    next()
  } else if (TokenState.token === '(') {
    consume('(')
    expr(TokenKind.Assign)
    consume(')')
  } else if (TokenState.token === TokenKind.Identifier) {
    const ident = TokenState.value
    next() // Ident
    emitted.push(OpCode.LOAD)
    emitted.push(ident)
  }

  while ((TokenState.token as number) >= level) {
    // console.log('level', level)
    if (TokenState.token === TokenKind.Add) { next(); emitted.push(OpCode.PUSH); expr(TokenKind.Multiply); emitted.push(OpCode.ADD) }
    else if (TokenState.token === TokenKind.Subtract) { next(); emitted.push(OpCode.PUSH); expr(TokenKind.Multiply); emitted.push(OpCode.SUB) }
    else if (TokenState.token === TokenKind.Multiply) { next(); emitted.push(OpCode.PUSH); expr(TokenKind.Multiply + 1); emitted.push(OpCode.MUL) }
    else if (TokenState.token === TokenKind.Divide) { next(); emitted.push(OpCode.PUSH); expr(TokenKind.Multiply + 1); emitted.push(OpCode.DIV) }
    else if (TokenState.token === TokenKind.LessThan) { next(); emitted.push(OpCode.PUSH); expr(TokenKind.Add); emitted.push(OpCode.LT) }
    else if (TokenState.token === ';') {
      next(';')
    }
    else if (TokenState.token === TokenKind.Assign) {
      next('=')
      const target = emitted.pop()
      const load = emitted.pop()
      if (load !== OpCode.LOAD || typeof target !== 'string') {
        error('bad lvalue in assignment')
      }
      expr(TokenKind.Assign)
      emitted.push(OpCode.STORE)
      emitted.push(target)
    }

    else { error('parsing fail ' + TokenState.token) }
  }
}

export function parse() {
  while (!Source.eof()) {
    statement()
  }
}
