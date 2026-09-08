import { EventEmitter } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { handleItems } from '../../../src/web/api/items.ts'

function mockRes() {
  const chunks: string[] = []
  return {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: '',
    writeHead(code: number, headers?: Record<string, string>) {
      this.statusCode = code
      if (headers) Object.assign(this.headers, headers)
    },
    end(chunk?: string) {
      if (chunk !== undefined) chunks.push(chunk)
      this.body = chunks.join('')
    },
  }
}

function mockReq(url: string): IncomingMessage {
  const req = new EventEmitter() as IncomingMessage & EventEmitter
  req.url = url
  req.method = 'GET'
  return req
}

describe('handleItems', () => {
  it('lists board items', async () => {
    const ctx = {
      role: {
        whoami: vi.fn(async () => ({ login: 'alice', maintainers: {}, errors: {} })),
        repoList: ['DangoSys/buckyball'],
        githubJson: vi.fn(async (path: string) => {
          const decoded = decodeURIComponent(path)
          if (decoded.includes('is:issue')) {
            return {
              items: [
                {
                  repository_url: 'https://api.github.com/repos/DangoSys/buckyball',
                  number: 1,
                  title: 'issue',
                  user: { login: 'alice' },
                  updated_at: '2026-01-02T00:00:00Z',
                  html_url: 'https://github.com/DangoSys/buckyball/issues/1',
                },
              ],
            }
          }
          return { items: [] }
        }),
      },
    }
    const res = mockRes()
    await handleItems(ctx as never, mockReq('/integrations/collaboration-panel/items'), res as unknown as ServerResponse)
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual([
      {
        repo: 'DangoSys/buckyball',
        kind: 'issue',
        number: 1,
        title: 'issue',
        author: 'alice',
        updatedAt: '2026-01-02T00:00:00Z',
        url: 'https://github.com/DangoSys/buckyball/issues/1',
      },
    ])
  })

  it('returns detail for a repo item', async () => {
    const ctx = {
      role: {
        repoList: ['DangoSys/buckyball'],
        githubJson: vi.fn(async (path: string) => {
          if (path.includes('/issues/3')) {
            return {
              number: 3,
              title: 't',
              user: { login: 'a' },
              updated_at: 't',
              html_url: 'u',
              state: 'open',
              body: 'b',
              labels: [],
              assignees: [],
            }
          }
          throw new Error(`unexpected ${path}`)
        }),
      },
    }
    const res = mockRes()
    await handleItems(
      ctx as never,
      mockReq('/integrations/collaboration-panel/items/DangoSys%2Fbuckyball/3'),
      res as unknown as ServerResponse,
    )
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toMatchObject({ repo: 'DangoSys/buckyball', number: 3, kind: 'issue', body: 'b' })
  })

  it('returns 401 when not logged in', async () => {
    const ctx = {
      role: {
        whoami: vi.fn(async () => {
          throw new Error('not logged in')
        }),
        repoList: ['DangoSys/buckyball'],
      },
    }
    const res = mockRes()
    await handleItems(ctx as never, mockReq('/integrations/collaboration-panel/items'), res as unknown as ServerResponse)
    expect(res.statusCode).toBe(401)
    expect(res.body).toMatch(/not logged in/)
  })
})
