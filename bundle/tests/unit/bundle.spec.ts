import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const pkgRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))

describe('@ruyiAi/dsh-osc', () => {
  it('depends on every osc plugin package', () => {
    const manifest = JSON.parse(readFileSync(resolve(pkgRoot, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
    }
    for (const name of [
      '@ruyiAi/dsh-osc-role',
      '@ruyiAi/dsh-osc-collaboration-panel',
      '@ruyiAi/dsh-osc-github-bot',
      '@ruyiAi/dsh-osc-hook-github',
      '@ruyiAi/dsh-osc-hook-zulip',
      '@ruyiAi/dsh-osc-pr-chat',
    ]) {
      expect(manifest.dependencies[name]).toBeTruthy()
    }
  })
})
