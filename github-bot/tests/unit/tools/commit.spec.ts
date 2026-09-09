import { generateKeyPairSync } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { commitBranch, defineCommitTool } from '../../../src/tools/api/commit.ts'
import type { Config } from '../../../src/config.ts'

describe('github_bot_commit', () => {
  let dir: string
  let config: Config

  afterEach(() => {
    vi.unstubAllGlobals()
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  function setupPem(): string {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    dir = mkdtempSync(join(tmpdir(), 'github-bot-'))
    const path = join(dir, 'key.pem')
    writeFileSync(path, privateKey.export({ type: 'pkcs8', format: 'pem' }).toString())
    config = {
      orgs: {
        DangoSys: { appId: 1, privateKeyFile: path, apiBaseUrl: 'https://example.test' },
      },
    }
    return path
  }

  it('registers as github_bot_commit', () => {
    setupPem()
    expect(defineCommitTool({ config }).name).toBe('github_bot_commit')
  })

  it('rejects empty changes before calling GitHub', async () => {
    setupPem()
    await expect(
      commitBranch(config, {
        org: 'DangoSys',
        repo: 'DangoSys/buckyball',
        base: 'main',
        branch: 'feat',
        message: 'm',
        changes: [],
      }),
    ).rejects.toThrow(/changes/)
  })

  it('creates branch commit via Git Data API', async () => {
    setupPem()
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const href = String(url)
      if (href.includes('/app/installations?')) {
        return new Response(JSON.stringify([{ id: 9, account: { login: 'DangoSys' } }]), { status: 200 })
      }
      if (href.includes('/access_tokens')) {
        return new Response(JSON.stringify({ token: 'tok', expires_at: 't' }), { status: 200 })
      }
      if (href.includes('/git/ref/heads/feat') && (!init?.method || init.method === 'GET')) {
        return new Response('Not Found', { status: 404 })
      }
      if (href.includes('/git/ref/heads/main')) {
        return new Response(JSON.stringify({ object: { sha: 'base-sha' } }), { status: 200 })
      }
      if (href.includes('/git/commits/base-sha')) {
        return new Response(JSON.stringify({ tree: { sha: 'tree-base' } }), { status: 200 })
      }
      if (href.includes('/git/blobs')) {
        return new Response(JSON.stringify({ sha: 'blob-sha' }), { status: 200 })
      }
      if (href.includes('/git/trees')) {
        return new Response(JSON.stringify({ sha: 'tree-sha' }), { status: 200 })
      }
      if (href.includes('/git/commits') && init?.method === 'POST') {
        return new Response(JSON.stringify({ sha: 'commit-sha' }), { status: 200 })
      }
      if (href.includes('/git/refs') && init?.method === 'POST') {
        return new Response(JSON.stringify({}), { status: 201 })
      }
      throw new Error(`unexpected fetch ${href} ${init?.method}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      commitBranch(config, {
        org: 'DangoSys',
        repo: 'DangoSys/buckyball',
        base: 'main',
        branch: 'feat',
        message: 'msg',
        changes: [{ path: 'a.txt', content: 'x' }],
      }),
    ).resolves.toEqual({
      commitSha: 'commit-sha',
      branch: 'feat',
      base: 'main',
      repo: 'DangoSys/buckyball',
    })
  })

  it('appends a fast-forward commit to an existing branch', async () => {
    setupPem()
    const patchBodies: unknown[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        const href = String(url)
        if (href.includes('/app/installations?')) {
          return new Response(JSON.stringify([{ id: 9, account: { login: 'DangoSys' } }]), { status: 200 })
        }
        if (href.includes('/access_tokens')) {
          return new Response(JSON.stringify({ token: 'tok', expires_at: 't' }), { status: 200 })
        }
        if (href.includes('/git/ref/heads/feat') && (!init?.method || init.method === 'GET')) {
          return new Response(JSON.stringify({ object: { sha: 'existing-head' } }), { status: 200 })
        }
        if (href.includes('/git/commits/existing-head')) {
          return new Response(JSON.stringify({ tree: { sha: 'tree-base' } }), { status: 200 })
        }
        if (href.includes('/git/blobs')) {
          return new Response(JSON.stringify({ sha: 'blob-sha' }), { status: 200 })
        }
        if (href.includes('/git/trees')) {
          return new Response(JSON.stringify({ sha: 'tree-sha' }), { status: 200 })
        }
        if (href.includes('/git/commits') && init?.method === 'POST') {
          return new Response(JSON.stringify({ sha: 'commit-sha' }), { status: 200 })
        }
        if (href.includes('/git/refs/heads/feat') && init?.method === 'PATCH') {
          patchBodies.push(init.body)
          return new Response(JSON.stringify({}), { status: 200 })
        }
        throw new Error(`unexpected fetch ${href} ${init?.method}`)
      }),
    )

    await expect(
      commitBranch(config, {
        org: 'DangoSys',
        repo: 'DangoSys/buckyball',
        base: 'main',
        branch: 'feat',
        message: 'msg',
        changes: [{ path: 'a.txt', content: 'x' }],
      }),
    ).resolves.toEqual({
      commitSha: 'commit-sha',
      branch: 'feat',
      base: 'main',
      repo: 'DangoSys/buckyball',
    })

    expect(patchBodies).toEqual([JSON.stringify({ sha: 'commit-sha', force: false })])
  })

  it('commits a submodule gitlink entry without creating a blob', async () => {
    setupPem()
    const treeBodies: unknown[] = []
    const blobHits: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        const href = String(url)
        if (href.includes('/app/installations?')) {
          return new Response(JSON.stringify([{ id: 9, account: { login: 'DangoSys' } }]), { status: 200 })
        }
        if (href.includes('/access_tokens')) {
          return new Response(JSON.stringify({ token: 'tok', expires_at: 't' }), { status: 200 })
        }
        if (href.includes('/git/ref/heads/feat') && (!init?.method || init.method === 'GET')) {
          return new Response(JSON.stringify({ object: { sha: 'existing-head' } }), { status: 200 })
        }
        if (href.includes('/git/commits/existing-head')) {
          return new Response(JSON.stringify({ tree: { sha: 'tree-base' } }), { status: 200 })
        }
        if (href.includes('/git/blobs')) {
          blobHits.push(href)
          return new Response(JSON.stringify({ sha: 'blob-sha' }), { status: 200 })
        }
        if (href.includes('/git/trees')) {
          treeBodies.push(init?.body)
          return new Response(JSON.stringify({ sha: 'tree-sha' }), { status: 200 })
        }
        if (href.includes('/git/commits') && init?.method === 'POST') {
          return new Response(JSON.stringify({ sha: 'commit-sha' }), { status: 200 })
        }
        if (href.includes('/git/refs/heads/feat') && init?.method === 'PATCH') {
          return new Response(JSON.stringify({}), { status: 200 })
        }
        throw new Error(`unexpected fetch ${href} ${init?.method}`)
      }),
    )

    const submoduleSha = 'db242ec4aab8d5e2374e41a457058386b8ef57a6'
    await expect(
      commitBranch(config, {
        org: 'DangoSys',
        repo: 'DangoSys/buckyball',
        base: 'main',
        branch: 'feat',
        message: 'bump submodule',
        changes: [{ path: '.agents/skills', sha: submoduleSha }],
      }),
    ).resolves.toEqual({ commitSha: 'commit-sha', branch: 'feat', base: 'main', repo: 'DangoSys/buckyball' })

    expect(blobHits).toEqual([])
    expect(treeBodies).toEqual([
      JSON.stringify({
        base_tree: 'tree-base',
        tree: [{ path: '.agents/skills', mode: '160000', type: 'commit', sha: submoduleSha }],
      }),
    ])
  })

  it('rejects a change that has neither content nor sha', async () => {
    setupPem()
    await expect(
      commitBranch(config, {
        org: 'DangoSys',
        repo: 'DangoSys/buckyball',
        base: 'main',
        branch: 'feat',
        message: 'msg',
        changes: [{ path: 'a.txt' }],
      }),
    ).rejects.toThrow(/exactly one of/)
  })
})
