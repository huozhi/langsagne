import { run } from './run.ts'
import type { Program, VmTraceStep } from './types.ts'

export function trace(program: Program): VmTraceStep[] {
  const steps: VmTraceStep[] = []
  run(program, step => steps.push(step))
  return steps
}
