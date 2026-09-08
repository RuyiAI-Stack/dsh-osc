import type { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KEY } from '../../../src/constants.ts'
import type { Config } from '../../../src/config.ts'
import { defineWhoamiTool, whoami } from '../../../src/tools/api/whoami.ts'
import type { RoleHost } from '../../../src/tools/libs/github.ts'

const config: Config = {
  clientId: 'cid',
  scopes: 'repo',
  apiBaseUrl: 'https://api.example.test',
  oauthBaseUrl: 'https://oauth.example.test',
}

function makeRole(overrides: {
  repoList?: readonly string[]
  readRecord?: ReturnType<typeof vi.fn>
}): RoleHost {
  return {
    config,
    repoList: overrides.repoList ?? ['DangoSys/buckyball'],
    ctx: {
      credentials: {
        readRecord: overrides.readRecord ?? vi.fn(async () => ({ kind: 'grant', payload: { accessToken: 'tok' } })),
      },
    } as unknown as Context,
  }
}

describe('role_whoami', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('registers as role_whoami', () => {
    expect(defineWhoamiTool(makeRole({})).name).toBe('role_whoami')
  })

  it('throws when not logged in', async () => {
    const readRecord = vi.fn(async () => undefined)
    await expect(whoami(makeRole({ readRecord }))).rejects.toThrow(/not logged in/)
  })

  it('returns login and maintainer map', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const href = String(url)
        if (href.endsWith('/user')) {
          return new Response(JSON.stringify({ login: 'alice' }), { status: 200 })
        }
        if (href.includes('/collaborators/alice/permission')) {
          return new Response(JSON.stringify({ permission: 'admin' }), { status: 200 })
        }
        throw new Error(`unexpected fetch ${href}`)
      }),
    )
    await expect(whoami(makeRole({}))).resolves.toEqual({
      login: 'alice',
      maintainers: { 'DangoSys/buckyball': true },
      errors: {},
    })
  })

  it('records 403/404 as errors and keeps other failures hard', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const href = String(url)
        if (href.endsWith('/user')) {
          return new Response(JSON.stringify({ login: 'alice' }), { status: 200 })
        }
        if (href.includes('/DangoSys/buckyball/')) {
          return new Response('forbidden', { status: 403 })
        }
        if (href.includes('/Other/repo/')) {
          return new Response('boom', { status: 500 })
        }
        throw new Error(`unexpected fetch ${href}`)
      }),
    )
    await expect(
      whoami(makeRole({ repoList: ['DangoSys/buckyball', 'Other/repo'] })),
    ).rejects.toThrow(/GitHub 500/)
    await expect(whoami(makeRole({ repoList: ['DangoSys/buckyball'] }))).resolves.toEqual({
      login: 'alice',
      maintainers: {},
      errors: { 'DangoSys/buckyball': { status: 403, message: 'GitHub 403: forbidden' } },
    })
  })

  it('reads credential via KEY', async () => {
    const readRecord = vi.fn(async () => ({ kind: 'grant', payload: { accessToken: 'tok' } }))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ login: 'alice' }), { status: 200 })),
    )
    await whoami(makeRole({ repoList: [], readRecord }))
    expect(readRecord).toHaveBeenCalledWith(KEY)
  })
})
