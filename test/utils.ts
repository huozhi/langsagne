import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))

export const readFile = (filename: string) => fs.readFileSync(path.resolve(testDir, filename), 'utf8')

export const logEmittedCode = (emitted: any[]) => {
  for (let i = 0; i < emitted.length; i++) {
    const command = emitted[i].toString()
    let text = command
    if (command === 'CONST') {
      text += (' ' + emitted[++i].toString())
    }
    console.log(text)
  }
}
