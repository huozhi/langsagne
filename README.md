# lang 
> Practice for interpretation of simple handmade language

## About

Thanks for cool practice of [c4](https://github.com/rswier/c4) and awesome explaination in [write a c interpreter](https://github.com/lotabout/write-a-C-interpreter). Still work in progress.

## Play

run the Bun test suite

```
bun run test
```

Visualize directive execution for the supported fixtures:

```
bun run trace
```

Trace a specific file:

```
bun run trace fixture/assignment
```

Step through execution interactively:

```
bun run trace -- --step fixture/loop
```

Use Enter or `n` for next, `p` for previous, and `q` to quit.

Run a TypeScript source file directly with Node's native type stripping:

```
node src/index.ts
```

Runtime/compiler code lives in `src/`, grouped by pipeline stage:
`lexer/`, `compiler/`, `runtime/`, and `debug/`.
Tests and test helpers live in `test/`.

## Plan

See [docs/design.md](docs/design.md) for the current gaps between this project and the c4-inspired language target.
