'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  inspect,
  type DirectiveItem,
  type InspectResult,
  type RuntimeValue,
  type VmTraceStep,
} from '../../src/index'

type Program = {
  name: string
  code: string
}

const programs: Program[] = [
  {
    name: 'weighted loop',
    code: `i = 0;
sum = 0;
while (i < 4) {
  sum = sum + i * 2;
  i = i + 1;
}
sum + i;`,
  },
  {
    name: 'print flow',
    code: `a = 1 + 2 * 3;
print(a);
b = a + 4;
b;`,
  },
  {
    name: 'complex expression',
    code: `base = 2 * (3 + 4);
offset = (base - 5) * (1 + 2);
offset + base;`,
  },
  {
    name: 'function call',
    code: `fn add(a, b) {
  return a + b;
}

fn double(value) {
  return add(value, value);
}

fn mix(x, y, z) {
  return add(double(x), add(y, z));
}

result = mix(2, 3, 4);
print(result);
result;`,
  },
]

const panelTitle = 'm-0 mb-2 text-[0.72rem] font-normal tracking-[0.14em] text-muted uppercase max-md:mb-1 max-md:text-[0.65rem]'
const switcherBtn = 'rounded-md bg-bg-elevated px-2 py-0.5 leading-tight text-muted hover:bg-highlight hover:text-fg'
const transportBtn = 'inline-flex size-8 items-center justify-center rounded-md bg-bg-elevated p-0 text-lg leading-none text-fg hover:bg-highlight hover:text-accent'
const lineRow = '-mx-1.5 grid min-h-[1.55rem] grid-cols-[3ch_1fr] items-center gap-2.5 rounded px-1.5 py-0.5 max-md:min-h-[1.35rem]'
const stateCell = 'box-border block max-w-full overflow-x-hidden overflow-y-auto rounded-md bg-bg-elevated p-2 break-words text-fg'

function valueText(value: RuntimeValue) {
  if (value === undefined) return 'undefined'
  return JSON.stringify(value)
}

type StateField = {
  name: string
  alias: string
  format: (snapshot: VmTraceStep['before']) => string
  rowClass: string
  codeClass: string
}

const stateFields: StateField[] = [
  {
    name: 'accumulator',
    alias: 'ax',
    format: snapshot => valueText(snapshot.ax),
    rowClass: 'h-[3.1rem]',
    codeClass: 'h-[2.1rem] min-h-[2.1rem] max-h-[2.1rem]',
  },
  {
    name: 'value stack',
    alias: 'vs',
    format: snapshot => stackCellText(snapshot.vs),
    rowClass: 'h-[5.35rem]',
    codeClass: 'h-[4.35rem] min-h-[4.35rem] max-h-[4.35rem]',
  },
  {
    name: 'environment',
    alias: 'env',
    format: snapshot => envCellText(snapshot.env),
    rowClass: 'h-[6.85rem]',
    codeClass: 'h-[5.85rem] min-h-[5.85rem] max-h-[5.85rem]',
  },
]

function envCellText(env: Record<string, RuntimeValue>) {
  const entries = Object.entries(env)
  if (entries.length === 0) return '{}'
  return entries.map(([key, value]) => `${key}: ${valueText(value)}`).join('\n')
}

function stackCellText(values: RuntimeValue[]) {
  if (values.length === 0) return '[]'
  return values.map((value, index) => `[${index}] ${valueText(value)}`).join('\n')
}

function directiveText(step: VmTraceStep) {
  return [step.op, ...step.operands].map(String).join(' ')
}

function metaSlotWidths(trace: readonly VmTraceStep[]) {
  const pcDigits = Math.max(String(Math.max(0, trace.length - 1)).length, 1)
  let directiveChars = 1
  for (const traceStep of trace) {
    directiveChars = Math.max(directiveChars, directiveText(traceStep).length)
  }
  return { pcDigits, directiveChars }
}

function directiveHasOperand(item: DirectiveItem) {
  return item === 'CONST' || item === 'LOAD' || item === 'STORE' || item === 'JMP' || item === 'BZ' || item === 'CALL' || item === 'PRINT'
}

type SourceRow = {
  line: string
  number: number
}

type DirectiveRow = {
  pc: number
  text: string
}

const sourceLineCount = 5

function sourceWindow(code: string, activeLine: number | null): SourceRow[] {
  const lines = code.split('\n')
  if (activeLine === null) {
    return lines.slice(0, sourceLineCount).map((line, index) => ({ line, number: index + 1 }))
  }

  const start = Math.max(1, Math.min(activeLine - 2, lines.length - sourceLineCount + 1))
  return lines.slice(start - 1, start - 1 + sourceLineCount).map((line, index) => ({
    line,
    number: start + index,
  }))
}

function directiveWindow(directives: readonly DirectiveItem[], activePc: number): DirectiveRow[] {
  const rows: DirectiveRow[] = []

  for (let index = 0; index < directives.length; index += 1) {
    const pc = index
    const item = directives[index]
    if (directiveHasOperand(item)) {
      index += 1
      rows.push({ pc, text: `${String(item)} ${String(directives[index])}` })
    } else {
      rows.push({ pc, text: String(item) })
    }
  }

  const activeIndex = Math.max(0, rows.findIndex(row => row.pc === activePc))
  const start = Math.max(0, Math.min(activeIndex - 2, rows.length - 6))
  return rows.slice(start, start + 6)
}

function isFormTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement
}

function previousProgramIndex(index: number) {
  return (index + programs.length - 1) % programs.length
}

function nextProgramIndex(index: number) {
  return (index + 1) % programs.length
}

function ProgramSwitcher({
  activeProgram,
  setActiveProgram,
  setActiveStep,
}: {
  activeProgram: number
  setActiveProgram: (value: number) => void
  setActiveStep: (value: number) => void
}) {
  const program = programs[activeProgram]

  return (
    <nav
      className="m-0 grid w-72 min-w-0 grid-cols-[auto_auto_1fr_auto] items-center gap-1.5 text-sm max-md:w-full"
      aria-label="program"
    >
      <span className="text-[0.72rem] tracking-widest text-muted uppercase">Program</span>
      <button
        type="button"
        className={switcherBtn}
        aria-label="Previous program"
        onClick={() => {
          setActiveProgram(previousProgramIndex(activeProgram))
          setActiveStep(0)
        }}
      >
        [&lt;]
      </button>
      <span className="w-full min-w-0 truncate text-center text-fg">{program.name}</span>
      <button
        type="button"
        className={switcherBtn}
        aria-label="Next program"
        onClick={() => {
          setActiveProgram(nextProgramIndex(activeProgram))
          setActiveStep(0)
        }}
      >
        [&gt;]
      </button>
    </nav>
  )
}

function ResultRow({ step, trace }: { step: VmTraceStep, trace: readonly VmTraceStep[] }) {
  const currentResult = valueText(step.after.ax)
  let resultChars = Math.max(currentResult.length, 4)
  for (const traceStep of trace) {
    resultChars = Math.max(resultChars, valueText(traceStep.after.ax).length)
  }

  return (
    <p className="mt-2 flex flex-nowrap items-baseline gap-1 overflow-hidden text-sm leading-snug whitespace-nowrap tabular-nums text-muted">
      <span className="shrink-0">result</span>
      <span className="min-w-0 truncate text-fg text-2xl" style={{ minWidth: `${resultChars}ch` }}>
        {currentResult}
      </span>
    </p>
  )
}

function OpsBoard({
  activeStep,
  stepCount,
  step,
  result,
  playing,
  setPlaying,
  setActiveStep,
}: {
  activeStep: number
  stepCount: number
  step: VmTraceStep
  result: InspectResult
  playing: boolean
  setPlaying: (value: boolean) => void
  setActiveStep: (value: number) => void
}) {
  const { pcDigits, directiveChars } = metaSlotWidths(result.trace)

  function pauseAndSetStep(value: number) {
    setPlaying(false)
    setActiveStep(value)
  }

  return (
    <section className="my-4 py-4 border-t border-line">
      <div className="flex flex-nowrap items-center justify-between gap-4 max-md:flex-col max-md:items-stretch max-md:gap-2">
        <p className="m-0 flex min-w-0 flex-1 flex-nowrap items-baseline gap-x-2 overflow-hidden p-0 text-sm leading-snug whitespace-nowrap tabular-nums text-muted max-md:text-xs">
          <span className="inline-flex shrink-0 items-baseline gap-1">
            <span>pc</span>
            <span className="inline-block text-right text-fg" style={{ width: `${pcDigits}ch` }}>{step.pc}</span>
          </span>
          <span className="shrink-0 text-gutter">·</span>
          <span className="inline-block shrink-0 truncate text-fg" style={{ width: `${directiveChars}ch` }}>
            {directiveText(step)}
          </span>
        </p>
        <StepTransport
          activeStep={activeStep}
          stepCount={stepCount}
          playing={playing}
          setPlaying={setPlaying}
          setActiveStep={pauseAndSetStep}
        />
      </div>
      <p className="mt-3 text-xs text-gutter max-md:hidden">
        <kbd className="rounded bg-highlight px-1 py-0.5 text-fg">←</kbd>{' '}
        <kbd className="rounded bg-highlight px-1 py-0.5 text-fg">→</kbd> step ·{' '}
        <kbd className="rounded bg-highlight px-1 py-0.5 text-fg">p</kbd> play ·{' '}
        <kbd className="rounded bg-highlight px-1 py-0.5 text-fg">[</kbd>{' '}
        <kbd className="rounded bg-highlight px-1 py-0.5 text-fg">]</kbd> program ·{' '}
        <kbd className="rounded bg-highlight px-1 py-0.5 text-fg">1</kbd>–<kbd className="rounded bg-highlight px-1 py-0.5 text-fg">3</kbd> pick ·{' '}
        <kbd className="rounded bg-highlight px-1 py-0.5 text-fg">r</kbd> restart
      </p>
    </section>
  )
}

function StepTransport({
  activeStep,
  stepCount,
  playing,
  setPlaying,
  setActiveStep,
}: {
  activeStep: number
  stepCount: number
  playing: boolean
  setPlaying: (value: boolean) => void
  setActiveStep: (value: number) => void
}) {
  const atStart = activeStep === 0
  const atEnd = activeStep >= stepCount - 1
  const digits = Math.max(String(stepCount).length, 1)
  const counterWidth = `${digits * 2 + 3}ch`
  const slotWidth = `${digits}ch`

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5 self-start max-md:w-full max-md:flex-row max-md:items-center max-md:justify-between">
      <div className="inline-flex items-center gap-0.5" aria-label="execution steps">
        <button
          type="button"
          className={transportBtn}
          disabled={atStart}
          aria-label="Previous step"
          onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
        >
          ‹
        </button>
        <span
          className="inline-flex items-baseline justify-center px-1.5 text-[0.88rem] tabular-nums"
          style={{ minWidth: counterWidth }}
          aria-live="polite"
        >
          <span className="text-right text-fg" style={{ width: slotWidth }}>{activeStep + 1}</span>
          <span className="px-0.5 text-gutter">/</span>
          <span className="text-left text-gutter" style={{ width: slotWidth }}>{stepCount}</span>
        </span>
        <button
          type="button"
          className={transportBtn}
          disabled={atEnd}
          aria-label="Next step"
          onClick={() => setActiveStep(Math.min(stepCount - 1, activeStep + 1))}
        >
          ›
        </button>
      </div>
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          className="rounded-md bg-transparent px-2 py-0.5 text-[0.78rem] tracking-wide text-muted hover:bg-highlight hover:text-accent disabled:opacity-30"
          disabled={stepCount <= 1}
          aria-pressed={playing}
          aria-label={playing ? 'Pause auto play' : 'Auto play steps'}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? 'pause' : 'play'}
        </button>
        <button
          type="button"
          className="rounded-md bg-transparent px-2 py-0.5 text-[0.78rem] tracking-wide text-muted hover:bg-highlight hover:text-accent disabled:opacity-30"
          disabled={atStart}
          aria-label="Restart from first step"
          onClick={() => setActiveStep(0)}
        >
          restart
        </button>
      </div>
    </div>
  )
}

function SourcePanel({ code, step }: { code: string, step: VmTraceStep }) {
  const lines = sourceWindow(code, step.sourceLine)
  return (
    <section className="flex min-w-0 flex-col overflow-hidden max-md:min-h-0">
      <h2 className={panelTitle}>code</h2>
      <ol className="m-0 h-[calc(5*1.55rem)] min-h-[calc(5*1.55rem)] list-none overflow-hidden p-0 text-[0.84rem] leading-snug max-md:h-[calc(5*1.35rem)] max-md:min-h-[calc(5*1.35rem)] max-md:text-[0.78rem] max-md:leading-tight">
        {lines.map(row => (
          <li
            key={row.number}
            className={`${lineRow} ${row.number === step.sourceLine ? 'bg-highlight text-fg' : ''}`}
          >
            <span className="text-gutter">{String(row.number).padStart(2, '0')}</span>
            <code className="block min-w-0 overflow-x-auto whitespace-pre">{row.line}</code>
          </li>
        ))}
      </ol>
    </section>
  )
}

function DirectivePanel({ result, step }: { result: InspectResult, step: VmTraceStep }) {
  const rows = directiveWindow(result.directives, step.pc)
  return (
    <section className="flex min-w-0 flex-col overflow-hidden max-md:min-h-0">
      <h2 className={panelTitle}>directives</h2>
      <ol className="m-0 h-[calc(6*1.55rem)] min-h-[calc(6*1.55rem)] list-none overflow-hidden p-0 text-[0.84rem] leading-snug max-md:h-[calc(5*1.35rem)] max-md:min-h-[calc(5*1.35rem)] max-md:text-[0.78rem] max-md:leading-tight">
        {rows.map(row => (
          <li
            key={row.pc}
            className={`${lineRow} ${row.pc === step.pc ? 'bg-highlight text-fg' : ''}`}
          >
            <span className="text-gutter">{String(row.pc).padStart(2, '0')}</span>
            <code>{row.text}</code>
          </li>
        ))}
      </ol>
    </section>
  )
}

function StatePanel({ step }: { step: VmTraceStep }) {
  return (
    <section className="mt-2 min-w-0 overflow-x-auto overflow-y-visible border-t border-line pt-3 max-md:mt-0 max-md:border-t-0 max-md:pt-0">
      <h2 className={panelTitle}>state</h2>
      <table className="w-[41rem] max-w-full table-fixed border-collapse text-[0.84rem] leading-snug max-md:text-[0.8rem]">
        <colgroup>
          <col className="w-44" />
          <col className="w-60" />
          <col className="w-60" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col" className="px-2.5 py-2 text-left align-top text-[0.72rem] font-normal tracking-widest text-muted uppercase">
              before
            </th>
            <th scope="col" className="px-2.5 py-2 text-left align-top text-[0.72rem] font-normal tracking-widest text-muted uppercase">
              after
            </th>
          </tr>
        </thead>
        <tbody>
          {stateFields.map(field => (
            <tr key={field.alias} className={`border-t border-line ${field.rowClass}`}>
              <th scope="row" className="px-2.5 py-2 text-left align-top font-normal text-fg">
                <span>{field.name}</span>
                <span className="text-gutter"> ({field.alias})</span>
              </th>
              <td className="overflow-hidden px-2.5 py-2 text-left align-top">
                <code className={`${stateCell} ${field.codeClass}`}>{field.format(step.before)}</code>
              </td>
              <td className="overflow-hidden px-2.5 py-2 text-left align-top">
                <code className={`${stateCell} ${field.codeClass}`}>{field.format(step.after)}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function TokenPanel({ result }: { result: InspectResult }) {
  return (
    <section className="mt-4 border-t border-line pt-4">
      <h2 className="m-0 mb-1.5 text-[0.65rem] font-normal tracking-[0.14em] text-muted uppercase">tokens</h2>
      <ol className="m-0 flex list-none flex-wrap gap-x-2 gap-y-1 p-0 text-[0.72rem] leading-snug">
        {result.tokens.map((token, index) => (
          <li key={`${token.line}-${token.label}-${index}`} className="inline-flex items-center gap-1 text-fg">
            <span className="text-[0.68rem] text-gutter">{token.line}</span>
            <code className="text-muted">{token.label}</code>
            {token.value !== null ? <small className="text-[0.68rem] text-gutter">{String(token.value)}</small> : null}
          </li>
        ))}
      </ol>
    </section>
  )
}

export function ExecutionView() {
  const [activeProgram, setActiveProgram] = useState(0)
  const [activeStep, setActiveStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const program = programs[activeProgram]
  const result = useMemo(() => inspect(program.code), [program.code])
  const step = result.trace[activeStep] ?? result.trace[0]

  useEffect(() => {
    setPlaying(false)
    setActiveStep(0)
  }, [program.code])

  useEffect(() => {
    if (!playing) return
    if (activeStep >= result.trace.length - 1) {
      setPlaying(false)
      return
    }
    const id = window.setTimeout(() => {
      setActiveStep(current => current + 1)
    }, 500)
    return () => window.clearTimeout(id)
  }, [playing, activeStep, result.trace.length])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isFormTarget(event.target)) return

      if (event.key === 'ArrowLeft' || event.key === 'h') {
        event.preventDefault()
        setPlaying(false)
        setActiveStep(current => Math.max(0, current - 1))
        return
      }

      if (event.key === 'ArrowRight' || event.key === 'l' || event.key === ' ') {
        event.preventDefault()
        setPlaying(false)
        setActiveStep(current => Math.min(result.trace.length - 1, current + 1))
        return
      }

      if (event.key === 'Home' || event.key.toLowerCase() === 'r') {
        event.preventDefault()
        setPlaying(false)
        setActiveStep(0)
        return
      }

      if (event.key.toLowerCase() === 'p') {
        event.preventDefault()
        setPlaying(current => !current)
        return
      }

      if (event.key === '[' || event.key === 'j') {
        event.preventDefault()
        setPlaying(false)
        setActiveProgram(current => previousProgramIndex(current))
        setActiveStep(0)
        return
      }

      if (event.key === ']' || event.key === 'k') {
        event.preventDefault()
        setPlaying(false)
        setActiveProgram(current => nextProgramIndex(current))
        setActiveStep(0)
        return
      }

      const programIndex = Number(event.key) - 1
      if (Number.isInteger(programIndex) && programIndex >= 0 && programIndex < programs.length) {
        event.preventDefault()
        setPlaying(false)
        setActiveProgram(programIndex)
        setActiveStep(0)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [result.trace.length])

  return (
    <div>
      <section className="flex flex-col gap-4 max-md:gap-3" aria-label="source and step controls">
        <ProgramSwitcher
          activeProgram={activeProgram}
          setActiveProgram={setActiveProgram}
          setActiveStep={setActiveStep}
        />
        <section className="grid grid-cols-2 items-start gap-5 max-md:grid-cols-2 max-md:gap-3">
          <SourcePanel code={program.code} step={step} />
          <DirectivePanel result={result} step={step} />
        </section>
        <ResultRow step={step} trace={result.trace} />
        <OpsBoard
          activeStep={activeStep}
          stepCount={result.trace.length}
          step={step}
          result={result}
          playing={playing}
          setPlaying={setPlaying}
          setActiveStep={setActiveStep}
        />
      </section>
      <section
        className="max-md:border-t max-md:border-line max-md:pt-6 max-md:pb-4"
        aria-label="vm state and tokens"
      >
        <StatePanel step={step} />
        <TokenPanel result={result} />
      </section>
    </div>
  )
}
