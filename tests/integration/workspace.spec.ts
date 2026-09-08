import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))

const plugins = [
  'role',
  'github-bot',
  'pr-chat',
  'hook-github',
  'hook-zulip',
  'collaboration-panel',
  'bundle',
] as const

describe('osc workspace layout', () => {
  it.each(plugins)('%s has package.json, cordis.patch.yml, and src/index.ts', name => {
    const dir = join(root, name)
    expect(existsSync(join(dir, 'package.json'))).toBe(true)
    expect(existsSync(join(dir, 'cordis.patch.yml'))).toBe(true)
    expect(existsSync(join(dir, 'src/index.ts'))).toBe(true)
    const index = readFileSync(join(dir, 'src/index.ts'), 'utf8')
    expect(index.startsWith('/**')).toBe(true)
    expect(index).toMatch(/@module dsh-osc/)
    if (name === 'bundle') return
    expect(existsSync(join(dir, 'README.md'))).toBe(true)
    expect(existsSync(join(dir, 'README.zh.md'))).toBe(true)
  })

  it('bundle patch inserts every workspace plugin package', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'bundle/package.json'), 'utf8')) as {
      dependencies: Record<string, string>
    }
    const patch = readFileSync(join(root, 'bundle/cordis.patch.yml'), 'utf8')
    const deps = Object.keys(manifest.dependencies).filter(n => n.startsWith('@ruyiAi/dsh-osc-'))
    expect(deps.length).toBeGreaterThan(0)
    for (const name of deps) {
      expect(patch).toContain(`name: '${name}'`)
    }
  })

  it('workspace packages list matches plugins on disk', () => {
    const dirs = readdirSync(root, { withFileTypes: true })
      .filter(e => e.isDirectory() && existsSync(join(root, e.name, 'package.json')))
      .map(e => e.name)
      .filter(n => n !== 'node_modules' && n !== 'tests')
      .sort()
    expect(dirs).toEqual([...plugins].sort())
  })
})
