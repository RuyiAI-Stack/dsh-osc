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
      '@deepseek-ai/dsh-webhook',
      '@ruyiAi/dsh-osc-role',
      '@ruyiAi/dsh-osc-collaboration-panel',
      '@ruyiAi/dsh-osc-github-bot',
      '@ruyiAi/dsh-osc-github-mention',
      '@ruyiAi/dsh-osc-hook-github',
      '@ruyiAi/dsh-osc-hook-zulip',
      '@ruyiAi/dsh-osc-pr-chat',
    ]) {
      expect(manifest.dependencies[name]).toBeTruthy()
    }
  })

  it('loads webhook runtime before github mention', () => {
    const patch = readFileSync(resolve(pkgRoot, 'cordis.patch.yml'), 'utf8')
    const runtime = patch.indexOf("name: '@deepseek-ai/dsh-webhook'")
    const mention = patch.indexOf("name: '@ruyiAi/dsh-osc-github-mention'")
    expect(runtime).toBeGreaterThanOrEqual(0)
    expect(runtime).toBeLessThan(mention)
  })
})
