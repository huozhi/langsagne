'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  inspect,
  type DirectiveItem,
  type InspectResult,
  type InspectToken,
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
sum + i;
print(sum + 4);
`,
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
const lineRow = '-mx-1.5 grid min-h-[1.55rem] grid-cols-[3ch_1fr] items-start gap-2.5 rounded px-1.5 py-0.5 max-md:min-h-[1.35rem]'
const sourceLineRow = `${lineRow} relative gap-x-3 max-md:gap-x-2.5`
const sourceLineHighlight = 'absolute inset-0 z-0 rounded bg-highlight'
const sourceGutter = 'relative z-10 shrink-0 pl-1 pt-px text-gutter max-md:pl-0.5'
const sourceCodeClass = 'relative z-10 block min-w-0 whitespace-pre-wrap break-words'
const tokenOverlayClass = 'pointer-events-none absolute z-[25] rounded-none bg-brown/60 backdrop-brightness-75 backdrop-contrast-125 transition-[top,left,width,height] duration-200 ease-out will-change-[top,left,width,height]'
const sourceList = 'm-0 min-h-[calc(5*1.55rem)] max-h-[calc(5*1.55rem)] list-none overflow-y-auto overflow-x-hidden p-0 text-[0.84rem] leading-snug max-md:min-h-[calc(5*1.35rem)] max-md:max-h-[calc(5*1.35rem)] max-md:text-[0.78rem] max-md:leading-tight'
const directiveList = 'm-0 min-h-[calc(5*1.55rem)] max-h-[calc(5*1.55rem)] list-none overflow-y-auto overflow-x-hidden p-0 text-[0.78rem] leading-snug max-md:min-h-[calc(5*1.35rem)] max-md:max-h-[calc(5*1.35rem)] max-md:text-[0.72rem] max-md:leading-tight'
const directiveLineRow = `${lineRow} relative`
const directiveLineHighlight = 'absolute inset-0 z-0 rounded bg-highlight'
const directiveGutter = 'relative z-10 shrink-0 pl-1 pt-px text-gutter max-md:pl-0.5'
const directiveCodeClass = 'relative z-10 min-w-0 break-words'
const stateCell = 'box-border block max-w-full overflow-x-hidden overflow-y-auto rounded-md bg-bg-elevated p-2 break-words whitespace-pre-wrap text-fg'

function valueText(value: RuntimeValue) {
  if (value === undefined) return 'undefined'
  return JSON.stringify(value)
}

type StateField = {
  name: string
  alias: string
  format: (snapshot: VmTraceStep['after']) => string
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

function isActiveToken(step: VmTraceStep, token: InspectToken) {
  return step.sourceLine === token.line
    && step.sourceColumn === token.column
    && step.sourceLength === token.length
}

type TokenOverlayRect = {
  height: number
  left: number
  top: number
  width: number
}

function setRangeCharacterBounds(range: Range, root: HTMLElement, start: number, end: number) {
  let offset = 0
  let startNode: Text | null = null
  let startOffset = 0
  let endNode: Text | null = null
  let endOffset = 0
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)

  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const length = node.data.length
    if (!startNode && offset + length > start) {
      startNode = node
      startOffset = start - offset
    }
    if (!endNode && offset + length >= end) {
      endNode = node
      endOffset = end - offset
      break
    }
    offset += length
  }

  if (!startNode || !endNode) return false
  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)
  return true
}

function overlayRectsEqual(a: TokenOverlayRect | null, b: TokenOverlayRect | null) {
  if (a === b) return true
  if (!a || !b) return false
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height
}

function measureOverlayRect(listEl: HTMLElement, code: HTMLElement, row: Element, start: number, end: number) {
  const range = document.createRange()
  if (!setRangeCharacterBounds(range, code, start, end)) return null

  const rangeRects = [...range.getClientRects()]
  if (rangeRects.length === 0) return null

  const tokenBox = rangeRects.reduce(
    (bounds, rect) => ({
      bottom: Math.max(bounds.bottom, rect.bottom),
      left: Math.min(bounds.left, rect.left),
      right: Math.max(bounds.right, rect.right),
      top: Math.min(bounds.top, rect.top),
    }),
    { bottom: -Infinity, left: Infinity, right: -Infinity, top: Infinity },
  )

  const rowRect = row.getBoundingClientRect()
  const listRect = listEl.getBoundingClientRect()
  return {
    top: Math.round(rowRect.top - listRect.top + listEl.scrollTop),
    left: Math.round(tokenBox.left - listRect.left + listEl.scrollLeft),
    width: Math.round(tokenBox.right - tokenBox.left),
    height: Math.round(rowRect.height),
  }
}

function measureFirstVisibleTokenOverlay(listEl: HTMLElement): TokenOverlayRect | null {
  const codes = listEl.querySelectorAll<HTMLElement>('[data-source-line]')
  for (const code of codes) {
    const row = code.closest('li')
    if (!row) continue
    const text = code.textContent ?? ''
    const match = /\S+/.exec(text)
    if (!match) continue
    const start = match.index
    const end = start + match[0].length
    const rect = measureOverlayRect(listEl, code, row, start, end)
    if (rect) return rect
  }
  return null
}

function measureTokenOverlay(listEl: HTMLElement, step: VmTraceStep): TokenOverlayRect | null {
  if (step.pc === 0) {
    return measureFirstVisibleTokenOverlay(listEl)
  }

  if (step.sourceLine === null || step.sourceColumn === null || step.sourceLength === null) {
    return measureFirstVisibleTokenOverlay(listEl)
  }

  const code = listEl.querySelector<HTMLElement>(`[data-source-line="${step.sourceLine}"]`)
  const row = code?.closest('li')
  if (!code || !row) return measureFirstVisibleTokenOverlay(listEl)

  const start = step.sourceColumn - 1
  const end = start + step.sourceLength
  return measureOverlayRect(listEl, code, row, start, end) ?? measureFirstVisibleTokenOverlay(listEl)
}

function renderSourceLine(line: string, lineNumber: number, step: VmTraceStep) {
  const isActiveLine = step.sourceLine === lineNumber
  const hasToken = isActiveLine && step.sourceColumn !== null && step.sourceLength !== null

  if (!hasToken) {
    return (
      <code className={sourceCodeClass} data-source-line={lineNumber}>
        {line}
      </code>
    )
  }

  const start = step.sourceColumn! - 1
  const end = start + step.sourceLength!
  return (
    <code className={sourceCodeClass} data-source-line={lineNumber}>
      {line.slice(0, start)}
      <span className="text-white">{line.slice(start, end)}</span>
      {line.slice(end)}
    </code>
  )
}

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
  const start = Math.max(0, Math.min(activeIndex - 2, rows.length - 5))
  return rows.slice(start, start + 5)
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
    <section className="my-2 py-2 border-t border-line">
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
  const listRef = useRef<HTMLOListElement>(null)
  const [tokenOverlay, setTokenOverlay] = useState<TokenOverlayRect | null>(null)

  const measureOverlay = useCallback(() => {
    const next = listRef.current ? measureTokenOverlay(listRef.current, step) : null
    setTokenOverlay(prev => (overlayRectsEqual(prev, next) ? prev : next))
  }, [step])

  useLayoutEffect(() => {
    measureOverlay()
    const listEl = listRef.current
    if (!listEl) return

    const observer = new ResizeObserver(() => measureOverlay())
    observer.observe(listEl)
    return () => {
      observer.disconnect()
    }
  }, [measureOverlay, code])

  return (
    <section className="flex min-w-0 flex-col overflow-hidden max-md:min-h-0">
      <h2 className={panelTitle}>code</h2>
      <ol ref={listRef} className={`${sourceList} relative`}>
        {tokenOverlay ? (
          <div
            aria-hidden
            className={tokenOverlayClass}
            data-token-overlay="source-active-token"
            style={{
              height: tokenOverlay.height,
              left: tokenOverlay.left - 4,
              top: tokenOverlay.top,
              width: tokenOverlay.width + 8,
            }}
          />
        ) : null}
        {lines.map(row => {
          const isActiveLine = row.number === step.sourceLine
          return (
            <li key={row.number} className={sourceLineRow}>
              {isActiveLine ? <div aria-hidden className={sourceLineHighlight} /> : null}
              <span className={`${sourceGutter} ${isActiveLine ? 'text-fg' : ''}`}>{String(row.number).padStart(2, '0')}</span>
              {renderSourceLine(row.line, row.number, step)}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function DirectivePanel({ result, step }: { result: InspectResult, step: VmTraceStep }) {
  const rows = directiveWindow(result.directives, step.pc)
  return (
    <section className="flex min-w-0 max-w-[13rem] flex-col overflow-hidden max-md:max-w-none max-md:min-h-0">
      <h2 className={panelTitle}>directives</h2>
      <ol className={directiveList}>
        {rows.map(row => {
          const isActive = row.pc === step.pc
          return (
            <li key={row.pc} className={directiveLineRow}>
              {isActive ? <div aria-hidden className={directiveLineHighlight} /> : null}
              <span className={`${directiveGutter} ${isActive ? 'text-fg' : ''}`}>{String(row.pc).padStart(2, '0')}</span>
              <code className={`${directiveCodeClass} ${isActive ? 'text-fg' : ''}`}>{row.text}</code>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function StatePanel({ step }: { step: VmTraceStep }) {
  return (
    <section className="mt-2 min-w-0 overflow-x-hidden overflow-y-visible border-t border-line pt-3 max-md:mt-0 max-md:border-t-0 max-md:pt-0">
      <h2 className={panelTitle}>state</h2>
      <table className="w-auto max-w-full table-fixed border-collapse text-[0.84rem] leading-snug max-md:text-[0.8rem]">
        <colgroup>
          <col className="w-44 max-md:w-36" />
          <col className="w-56 max-md:w-44" />
        </colgroup>
        <tbody>
          {stateFields.map(field => (
            <tr key={field.alias} className={`border-t border-line ${field.rowClass}`}>
              <th scope="row" className="px-2.5 py-2 text-left align-top font-normal text-fg">
                <span>{field.name}</span>
                <span className="text-gutter"> ({field.alias})</span>
              </th>
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

function TokenPanel({ result, step }: { result: InspectResult, step: VmTraceStep }) {
  return (
    <section className="mt-4 border-t border-line pt-4">
      <h2 className="m-0 mb-1.5 text-[0.65rem] font-normal tracking-[0.14em] text-muted uppercase">tokens</h2>
      <ol className="m-0 flex list-none flex-wrap gap-x-2 gap-y-1 p-0 text-[0.72rem] leading-snug">
        {result.tokens.map((token, index) => (
          <li
            key={`${token.line}-${token.column}-${token.label}-${index}`}
            className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-fg ${isActiveToken(step, token) ? 'bg-highlight' : ''}`}
          >
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
        <section className="grid grid-cols-[minmax(0,1fr)_minmax(9rem,13rem)] items-start gap-5 max-md:grid-cols-[minmax(0,1fr)_minmax(7rem,9rem)] max-md:gap-3">
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
        className="max-md:border-t max-md:border-line max-md:pt-4 max-md:pb-2"
        aria-label="vm state and tokens"
      >
        <StatePanel step={step} />
        <TokenPanel result={result} step={step} />
      </section>
    </div>
  )
}
