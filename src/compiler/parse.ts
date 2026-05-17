import Context from '../lexer/context.ts'
import Source from '../lexer/source.ts'
import { TokenKind } from '../lexer/token-kind.ts'
import next from '../lexer/tokenize.ts'
import { OpCode } from '../runtime/op-code.ts'
import { emitted } from '../runtime/vm.ts'

const error = (message = '') => { throw new Error('PARSE ERR: ' + message) }

function consume(expected: string | number) {
  if (Context.token !== expected) {
    const actual = typeof Context.token === 'number' ? TokenKind.label(Context.token) : Context.token
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
  if (!Context.token && !Source.eof()) next()

  if (!Source.eof() && Context.token === TokenKind.While) {
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
  } else if (Context.token === '{') {
    block()
  } else if (Context.token === ';') {
    next() // // empty statement
  } else {
    expr(TokenKind.Assign)
    if (Context.token === ';') { next(';') } else { error(`expected ; but get ${TokenKind.label(Context.token as number)}`) }
  }
}

function block() {
  consume('{')
  while (!Source.eof() && Context.token !== '}') {
    statement()
  }
  consume('}')
}

function expr(level = 0) {
  if (Source.eof()) return
  // console.log('Source.val', Source.val)
  if (Context.token === TokenKind.Number) {
    // console.log('push value', Context.value)
    emitted.push(OpCode.CONST)
    emitted.push(Context.value)
    next()
  } else if (Context.token === '(') {
    consume('(')
    expr(TokenKind.Assign)
    consume(')')
  } else if (Context.token === TokenKind.Identifier) {
    const ident = Context.value
    next() // Ident
    emitted.push(OpCode.LOAD)
    emitted.push(ident)
  }

  while ((Context.token as number) >= level) {
    // console.log('level', level)
    if (Context.token === TokenKind.Add) { next(); emitted.push(OpCode.PUSH); expr(TokenKind.Multiply); emitted.push(OpCode.ADD) }
    else if (Context.token === TokenKind.Subtract) { next(); emitted.push(OpCode.PUSH); expr(TokenKind.Multiply); emitted.push(OpCode.SUB) }
    else if (Context.token === TokenKind.Multiply) { next(); emitted.push(OpCode.PUSH); expr(TokenKind.Multiply + 1); emitted.push(OpCode.MUL) }
    else if (Context.token === TokenKind.Divide) { next(); emitted.push(OpCode.PUSH); expr(TokenKind.Multiply + 1); emitted.push(OpCode.DIV) }
    else if (Context.token === TokenKind.LessThan) { next(); emitted.push(OpCode.PUSH); expr(TokenKind.Add); emitted.push(OpCode.LT) }
    else if (Context.token === ';') {
      next(';')
    }
    else if (Context.token === TokenKind.Assign) {
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

    else { error('parsing fail ' + Context.token) }
  }
}

export function parse() {
  while (!Source.eof()) {
    statement()
  }
}

export default parse
