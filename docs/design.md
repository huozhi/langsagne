# Design Notes

This project is an experimental language/runtime inspired by [rswier/c4](https://github.com/rswier/c4). The local clone at `/Users/huozhi/source/c4` is only a quick reference while iterating; the upstream project link is the canonical reference to cite.

The goal is not to clone c4 or C. The goal is to keep c4's tiny compiler philosophy while building a simple JavaScript-like function language that can run inside JavaScript.

```js
fn add(a, b) {
  return a + b;
}

result = add(1, 2);
result;
```

## Four-Part Philosophy

c4 is useful here because it shows that a language can be understood as four cooperating parts. This project should keep that shape, but make each part explicit and testable.

```text
        +-------------+
text -> | 1. tokenize | -> tokens
        +-------------+
                 |
                 v
        +-------------+
        | 2. parse    | -> syntax decisions
        +-------------+
                 |
                 v
        +-------------+
        | 3. emit     | -> directives / bytecode
        +-------------+
                 |
                 v
        +-------------+
        | 4. execute  | -> JavaScript value
        +-------------+
```

1. `tokenize`: read characters and produce small token facts like `number`, `identifier`, `+`, `fn`, `return`.
2. `parse`: understand token order, such as expression precedence, blocks, calls, and function declarations.
3. `emit`: write simple directives that describe what the VM should do.
4. `execute`: walk directives with a tiny runtime stack and produce the final value.

## c4 Concept Mapping

This project keeps c4's broad flow, but uses names and runtime shapes that fit a small JavaScript-like language.

```text
c4 concept                 this project                         purpose
--------------------------------------------------------------------------------
p, lp                      lexer - source cursor                source position
tk, ival                   lexer - token context                current token/value
token constants            lexer - token kinds                  token names + precedence
next()                     lexer - tokenizer                    scan chars into tokens
sym, id                    lexer - symbol table                 identifier metadata
expr(), stmt()             compiler - parser                    parse and emit directives
e, le                      runtime - emitted directives         directive array
opcode constants           runtime - opcodes                    directive names
pc                         runtime - pc                         directive pointer
a                          runtime - ax                         accumulator/current value
sp                         runtime - vs                         value stack for expressions
data + globals             runtime - env                        runtime name/value table
bp + call stack behavior   runtime - future cs                  function frames
-s / debug printing        debug - trace renderer               ASCII execution trace
```

The biggest intentional difference is memory. c4 stores globals and strings in a C-like `data` area and uses addresses. This project uses `env` instead:

```text
c4 style
  symbol "sum" -> address in data
  load address -> load value
  store address -> write value

this project
  env.get("sum")
  env.set("sum", 45)
```

The other important difference is the stack. c4 uses one compact stack for expression operands, call arguments, saved frame pointers, and return addresses. This project splits that into simpler pieces:

```text
c4
  sp = one stack for many jobs
  bp = frame base pointer
  pc = instruction pointer
  a  = accumulator

this project
  vs = value stack for expression operands
  cs = future call stack for function frames
  pc = directive pointer
  ax = accumulator
```

That split is less minimal than c4, but much easier to visualize in traces.

## Directive Flow

"Directive" means the small instruction emitted by the compiler. The VM does not execute source text directly; it executes directives.

```text
source
  "x = 1 + 2; x;"

tokens
  ident(x) = num(1) + num(2) ; ident(x) ;

directives
  CONST 1
  PUSH
  CONST 2
  ADD
  STORE x
  LOAD x
  HALT

execution
  ax = 1
  stack = [1]
  ax = 2
  ax = stack.pop() + ax
  env.x = ax
  ax = env.x
  return ax
```

For a function call:

```text
source
  fn add(a, b) { return a + b; }
  add(1, 2);

directives
  FUNC add params(a,b) entry(add:start)
  JMP main

add:start
  LOAD a
  PUSH
  LOAD b
  ADD
  RET

main
  CONST 1
  ARG
  CONST 2
  ARG
  CALL add 2
  HALT
```

The first implementation does not need this exact directive format. The important rule is that directives stay small, printable, and easy to test.

## Runtime Shape

Keep the runtime closer to a small JavaScript interpreter than to c4's full C machine. Avoid modeling C memory, syscalls, pointer arithmetic, `malloc`, `printf`, or byte-addressed character storage until there is a clear experiment that needs them.

```text
+------------------+       +------------------+
| env              |       | cs               |
| x -> 3           |       | frame(add)       |
| add -> function  |       | frame(main)      |
+------------------+       +------------------+

+------------------+       +------------------+
| vs               |       | registers        |
| [left operands]  |       | pc, ax           |
+------------------+       +------------------+
```

- `env`: environment. A runtime name/value table for variables and, later, function names. Assignment creates or updates a binding, so `sum = 45` means `env.set("sum", 45)`.
- `vs`: value stack. Temporary expression values, like the left side of `1 + 2`.
- `cs`: call stack. Function frames with parameters, local variables, and return positions.
- `pc`: program counter. Index of the current directive.
- `ax`: accumulator. Current value register, used by arithmetic, loads, stores, and returns.

## Stack Walkthrough

The value stack (`vs`) is only for temporary expression values. The accumulator (`ax`) holds the current value. When an operation needs to remember the left side while computing the right side, it pushes `ax` onto `vs`.

For `1 + 2 * 3`, the emitted directives can look like this:

```text
CONST 1
PUSH
CONST 2
PUSH
CONST 3
MUL
ADD
HALT
```

Step by step:

```text
start

  ax: undefined
  vs: []

CONST 1

  ax: 1
  vs: []

PUSH

  ax: 1
  vs: [1]
       ^
       remembered left side of +

CONST 2

  ax: 2
  vs: [1]

PUSH

  ax: 2
  vs: [1, 2]
          ^
          remembered left side of *

CONST 3

  ax: 3
  vs: [1, 2]

MUL

  right = ax            -> 3
  left  = vs.pop()      -> 2
  ax    = left * right  -> 6

  ax: 6
  vs: [1]

ADD

  right = ax            -> 6
  left  = vs.pop()      -> 1
  ax    = left + right  -> 7

  ax: 7
  vs: []
```

The value stack (`vs`) grows when the VM must pause one calculation to start another. It shrinks when an opcode combines the remembered value with `ax`.

```text
expression tree          directive behavior

      +
     / \                 CONST 1
    1   *                PUSH          remember 1
       / \               CONST 2
      2   3              PUSH          remember 2
                         CONST 3
                         MUL           2 * 3 -> ax
                         ADD           1 + ax -> ax
```

Function calls need a second stack: the call stack (`cs`). Keep `cs` separate from `vs` so expression math and function frames do not fight each other.

```text
fn add(a, b) {
  return a + b;
}

add(1, 2);
```

Call setup:

```text
before CALL add 2

  ax: 2
  vs: []
  pending args: [1, 2]
  cs: [main frame]

CALL add 2

  vs: []
  cs:
    +----------------------+
    | add frame            |
    | params: a=1, b=2     |
    | return pc: main+next |
    +----------------------+
    | main frame           |
    +----------------------+
```

Inside `add`, expression evaluation still uses `vs`:

```text
LOAD a

  ax: 1
  vs: []

PUSH

  ax: 1
  vs: [1]

LOAD b

  ax: 2
  vs: [1]

ADD

  ax: 3
  vs: []

RET

  pop add frame
  restore pc to return pc
  keep ax as the function result
```

After return:

```text
  ax: 3
  vs: []
  cs: [main frame]
```

Rule of thumb:

- Use `vs` (value stack) for expression operands.
- Use `cs` (call stack) for function frames.
- Use `pc` (program counter) to choose the next directive.
- Keep the result of every expression in `ax` (accumulator).
- Keep `RET` simple: remove the current frame from `cs` and leave the return value in `ax`.

## Current Shape

The source tree is grouped by the few concepts in the compiler/runtime pipeline:

```text
src/
  lexer/      source cursor, token state, tokenizer, token kinds
  compiler/   parser and directive emission
  runtime/    opcodes, VM state, execution, reset helpers
  debug/      ASCII trace rendering
```

- `src/lexer/source.ts`: source text and cursor.
- `src/lexer/context.ts`: current token and token value.
- `src/lexer/tokenize.ts`: character stream to tokens.
- `src/lexer/token-kind.ts`: token names and precedence ordering. This is a plain object, not a TypeScript `enum`.
- `src/lexer/symbol-table.ts`: current identifier metadata. This should evolve toward JavaScript-like bindings rather than C-like symbols.
- `src/compiler/parse.ts`: statement/expression parser and directive emission.
- `src/runtime/storage.ts`: VM registers and runtime state: `env`, `vs`, `pc`, and `ax`.
- `src/runtime/op-code.ts`: VM directive names.
- `src/runtime/vm.ts`: emitted directives and interpreter loop.
- `src/runtime/runtime.ts`: reset helper for tests and repeated runs.
- `src/debug/trace.ts`: ASCII execution trace rendering.

## Near-Term Plan

1. Add function declarations with parameters and `return`.
2. Add function calls with a simple call frame model.
3. Add a `cs` call stack while keeping expression operands on `vs`.
4. Decide whether assignment updates outer bindings or always writes to the current frame.
5. Keep arithmetic, precedence, and block tests small and readable.

## Language Scope

Start with this tiny surface:

```text
program     -> statement*
statement   -> ident = expression ;
            | return expression ;
            | fn ident ( params ) block
            | expression ;
block       -> { statement* }
expression  -> number
            | ident
            | ident ( args )
            | expression (+ | - | * | /) expression
            | ( expression )
```

Delay these until later:

- C-style memory and pointers.
- System/runtime calls like file IO and allocation.
- Byte-level `char` storage.
- Self-hosting.
- Large standard library behavior.

## Test Milestones

- Tokenizer tests for `fn`, `return`, identifiers, numbers, and operators.
- Parser/directive tests for arithmetic, assignment, `return`, function declarations, and calls.
- VM tests for `CONST`, `LOAD`, `STORE`, `PUSH`, arithmetic, `CALL`, and `RET`.
- Integration tests that compile and execute small JavaScript-like programs.
