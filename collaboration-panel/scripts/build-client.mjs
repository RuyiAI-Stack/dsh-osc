import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const parts = await Promise.all([
  'client.js',
  'style.js',
  'icons.js',
  'panel.js',
  'entry.js',
].map(file => readFile(resolve(root, 'src/frontend', file), 'utf8')))
const packageId = '@ruyiAi/dsh-osc-collaboration-panel'
const body = parts.join('\n')
const entry = `window.__ModuleLoader__.load({\n  id: ${JSON.stringify(packageId)},\n  factory: (require) => {\n    const module = { exports: {} }\n    ${body}\n    module.exports.apply = apply\n    module.exports.inject = ['slots']\n    return module.exports\n  },\n})\n`
await mkdir(resolve(root, 'lib'), { recursive: true })
await writeFile(resolve(root, 'lib/client.js'), entry)
