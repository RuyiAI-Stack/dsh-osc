import { generateKeyPairSync } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineOpenPullRequestTool, openPullRequest } from '../../../src/tools/api/open-pull-request.ts'
import type { Config } from '../../../src/config.ts'

describe('github_bot_open_pull_request', () => {
  let dir: string
  let config: Config

  afterEach(() => {
    vi.unstubAllGlobals()
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  function setupPem(): void {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    dir = mkdtempSync(join(tmpdir(), 'github-bot-'))
    const path = join(dir, 'key.pem')
    writeFileSync(path, privateKey.export({ type: 'pkcs8', format: 'pem' }).toString())
    config = {
      orgs: {
        DangoSys: { appId: 1, privateKeyFile: path, apiBaseUrl: 'https://example.test' },
      },
    }
  }

  it('registers as github_bot_open_pull_request', () => {
    setupPem()
    expect(defineOpenPullRequestTool({ config }).name).toBe('github_bot_open_pull_request')
  })

  it('rejects bad repo before calling GitHub', async () => {
    setupPem()
    await expect(
      openPullRequest(config, {
        org: 'DangoSys',
        repo: 'bad',
        base: 'main',
        head: 'feat',
        title: 't',
        body: 'b',
      }),
    ).rejects.toThrow(/owner\/name/)
  })

  it('opens a pull request', async () => {
    setupPem()
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
        if (href.includes('/pulls') && init?.method === 'POST') {
          return new Response(
            JSON.stringify({ number: 7, html_url: 'https://github.com/DangoSys/buckyball/pull/7' }),
            { status: 201 },
          )
        }
        throw new Error(`unexpected fetch ${href}`)
      }),
    )

    await expect(
      openPullRequest(config, {
        org: 'DangoSys',
        repo: 'DangoSys/buckyball',
        base: 'main',
        head: 'feat',
        title: 'title',
        body: 'body',
      }),
    ).resolves.toEqual({
      number: 7,
      url: 'https://github.com/DangoSys/buckyball/pull/7',
      head: 'feat',
      base: 'main',
      repo: 'DangoSys/buckyball',
    })
  })
})
