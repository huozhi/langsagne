import fs from 'node:fs'
import path from 'node:path'
import { parse } from '../src/compiler/parse.ts'
import { renderTrace, renderTraceFrame } from '../src/debug/trace.ts'
import Source from '../src/lexer/source.ts'
import { resetRuntime } from '../src/runtime/runtime.ts'
import VM from '../src/runtime/vm.ts'

const defaultFixtures = [
  'fixture/expression',
  'fixture/assignment',
  'fixture/loop',
]

const args = process.argv.slice(2)
const stepMode = args.includes('--step') || args.includes('-s')
const files = args.filter(arg => arg !== '--step' && arg !== '-s')
const targets = files.length > 0 ? files : defaultFixtures

function compileFixture(target: string) {
  const filename = path.resolve(process.cwd(), target)
  const source = fs.readFileSync(filename, 'utf8')

  resetRuntime(source)
  Source.initialize(source)
  parse()
  const trace = VM.execute({ trace: true })
  const emitted = [...VM.emitted]

  return { emitted, source, target, trace }
}

function clearScreen() {
  process.stdout.write('\x1Bc')
}

async function waitForKey() {
  return new Promise<'next' | 'previous' | 'quit'>(resolve => {
    const onData = (data: Buffer) => {
      const key = data.toString()
      process.stdin.off('data', onData)

      if (key === 'q' || key === '\u0003') resolve('quit')
      else if (key === 'p') resolve('previous')
      else resolve('next')
    }

    process.stdin.once('data', onData)
  })
}

async function renderInteractive(target: string) {
  const { emitted, source, trace } = compileFixture(target)
  let step = 0

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
  }
  process.stdin.resume()

  while (true) {
    clearScreen()
    console.log(renderTraceFrame(target, source, emitted, trace, step))

    const action = await waitForKey()
    if (action === 'quit') break
    if (action === 'previous') step = Math.max(0, step - 1)
    else if (step >= trace.length - 1) break
    else step += 1
  }

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false)
  }
  process.stdin.pause()
}

if (stepMode) {
  await renderInteractive(targets[0])
} else {
  for (const [index, target] of targets.entries()) {
    const { emitted, source, trace } = compileFixture(target)

    if (index > 0) console.log('\n')
    console.log(renderTrace(target, source, emitted, trace))
  }
}
