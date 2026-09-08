import { EventEmitter } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { RepoListStore } from '../../../src/service/repoList.ts'
import { handleRepos } from '../../../src/web/api/repos.ts'

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

function mockReq(method: string, body?: string): IncomingMessage {
  const req = new EventEmitter() as IncomingMessage & EventEmitter
  req.method = method
  ;(req as IncomingMessage & { [Symbol.asyncIterator]: () => AsyncIterator<Buffer> })[Symbol.asyncIterator] =
    async function* () {
      if (body !== undefined) yield Buffer.from(body)
    }
  return req
}

describe('handleRepos', () => {
  let home: string
  let store: RepoListStore

  afterEach(() => {
    rmSync(home, { recursive: true, force: true })
  })

  function setup() {
    home = mkdtempSync(join(tmpdir(), 'role-repos-'))
    store = new RepoListStore(home)
  }

  it('GET returns repoList', async () => {
    setup()
    store.save(['DangoSys/buckyball'])
    const res = mockRes()
    await handleRepos(store, mockReq('GET'), res as unknown as ServerResponse)
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual(['DangoSys/buckyball'])
  })

  it('POST adds a repo', async () => {
    setup()
    const res = mockRes()
    await handleRepos(
      store,
      mockReq('POST', JSON.stringify({ repo: 'DangoSys/buckyball' })),
      res as unknown as ServerResponse,
    )
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual(['DangoSys/buckyball'])
    expect(store.load()).toEqual(['DangoSys/buckyball'])
  })

  it('DELETE removes a repo', async () => {
    setup()
    store.save(['DangoSys/buckyball', 'Other/repo'])
    const res = mockRes()
    await handleRepos(
      store,
      mockReq('DELETE', JSON.stringify({ repo: 'Other/repo' })),
      res as unknown as ServerResponse,
    )
    expect(JSON.parse(res.body)).toEqual(['DangoSys/buckyball'])
  })

  it('rejects bad method and bad repo', async () => {
    setup()
    const methodRes = mockRes()
    await handleRepos(store, mockReq('PATCH'), methodRes as unknown as ServerResponse)
    expect(methodRes.statusCode).toBe(405)

    const badRes = mockRes()
    await handleRepos(store, mockReq('POST', JSON.stringify({ repo: 'bad' })), badRes as unknown as ServerResponse)
    expect(badRes.statusCode).toBe(400)
    expect(badRes.body).toMatch(/bad repo/)
  })
})
