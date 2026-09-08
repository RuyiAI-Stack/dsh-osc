import { EventEmitter } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { handleLogin } from '../../../src/web/api/login.ts'

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
    write(chunk: string) {
      chunks.push(chunk)
      return true
    },
    end(chunk?: string) {
      if (chunk !== undefined) chunks.push(chunk)
      this.body = chunks.join('')
    },
  }
}

function mockReq(method: string): IncomingMessage {
  const req = new EventEmitter() as IncomingMessage & EventEmitter
  req.method = method
  return req
}

describe('handleLogin', () => {
  it('rejects non-POST', async () => {
    const res = mockRes()
    await handleLogin(vi.fn(), mockReq('GET'), res as unknown as ServerResponse)
    expect(res.statusCode).toBe(405)
    expect(res.body).toBe('POST only')
  })

  it('streams done event on success', async () => {
    const login = vi.fn(async () => ({ login: 'alice' }))
    const res = mockRes()
    await handleLogin(login, mockReq('POST'), res as unknown as ServerResponse)
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/event-stream/)
    expect(res.body).toContain('event: done')
    expect(res.body).toContain('"login":"alice"')
    expect(login).toHaveBeenCalledOnce()
  })

  it('streams error event on failure', async () => {
    const login = vi.fn(async () => {
      throw new Error('boom')
    })
    const res = mockRes()
    await handleLogin(login, mockReq('POST'), res as unknown as ServerResponse)
    expect(res.body).toContain('event: error')
    expect(res.body).toContain('"message":"boom"')
  })
})
