import { generateKeyPairSync } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createComment, defineCreateCommentTool } from '../../../src/tools/api/create-comment.ts'
import type { Config } from '../../../src/config.ts'

describe('github_bot_create_comment', () => {
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

  it('registers as github_bot_create_comment', () => {
    setupPem()
    expect(defineCreateCommentTool({ config }).name).toBe('github_bot_create_comment')
  })

  it('rejects bad repo before calling GitHub', async () => {
    setupPem()
    await expect(
      createComment(config, { org: 'DangoSys', repo: 'bad', number: 1, body: 'hi' }),
    ).rejects.toThrow(/owner\/name/)
  })

  it('rejects empty body before calling GitHub', async () => {
    setupPem()
    await expect(
      createComment(config, { org: 'DangoSys', repo: 'DangoSys/buckyball', number: 1, body: '' }),
    ).rejects.toThrow(/body is required/)
  })

  it('posts a comment as the App installation', async () => {
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
        if (href.includes('/issues/1/comments') && init?.method === 'POST') {
          return new Response(
            JSON.stringify({ id: 42, html_url: 'https://github.com/DangoSys/buckyball/issues/1#issuecomment-42' }),
            { status: 201 },
          )
        }
        throw new Error(`unexpected fetch ${href}`)
      }),
    )

    await expect(
      createComment(config, { org: 'DangoSys', repo: 'DangoSys/buckyball', number: 1, body: 'hi' }),
    ).resolves.toEqual({
      commentId: 42,
      url: 'https://github.com/DangoSys/buckyball/issues/1#issuecomment-42',
      repo: 'DangoSys/buckyball',
    })
  })

  it('throws when the response is invalid', async () => {
    setupPem()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const href = String(url)
        if (href.includes('/app/installations?')) {
          return new Response(JSON.stringify([{ id: 9, account: { login: 'DangoSys' } }]), { status: 200 })
        }
        if (href.includes('/access_tokens')) {
          return new Response(JSON.stringify({ token: 'tok', expires_at: 't' }), { status: 200 })
        }
        if (href.includes('/issues/1/comments')) {
          return new Response(JSON.stringify({ id: 'x' }), { status: 201 })
        }
        throw new Error(`unexpected fetch ${href}`)
      }),
    )
    await expect(
      createComment(config, { org: 'DangoSys', repo: 'DangoSys/buckyball', number: 1, body: 'hi' }),
    ).rejects.toThrow(/missing id or html_url/)
  })
})
