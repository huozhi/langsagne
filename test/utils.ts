import type { DirectiveItem } from '../src/runtime/vm.ts'

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))

export const readFile = (filename: string) => fs.readFileSync(path.resolve(testDir, filename), 'utf8')

export const logDirectives = (directives: readonly DirectiveItem[]) => {
  for (let i = 0; i < directives.length; i++) {
    const command = String(directives[i])
    let text = command
    if (command === 'CONST') {
      text += (' ' + String(directives[++i]))
    }
    console.log(text)
  }
}
