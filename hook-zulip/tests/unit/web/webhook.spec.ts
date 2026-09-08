import { EventEmitter } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Config } from '../../../src/config.ts'
import { handleWebhook } from '../../../src/web/api/webhook.ts'

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

describe('handleWebhook', () => {
  const emit = vi.fn()
  const config: Config = { token: 'secret' }

  beforeEach(() => {
    emit.mockClear()
  })

  it('rejects non-POST', async () => {
    const res = mockRes()
    await handleWebhook({ emit } as never, config, mockReq('GET'), res as unknown as ServerResponse)
    expect(res.statusCode).toBe(405)
  })

  it('authorizes and emits hook/zulip', async () => {
    const res = mockRes()
    await handleWebhook(
      { emit } as never,
      config,
      mockReq('POST', JSON.stringify({ token: 'secret', text: 'hi' })),
      res as unknown as ServerResponse,
    )
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual({ response_not_required: true })
    expect(emit).toHaveBeenCalledWith('hook/zulip', { text: 'hi' })
  })

  it('returns 401 on bad token', async () => {
    const res = mockRes()
    await handleWebhook(
      { emit } as never,
      config,
      mockReq('POST', JSON.stringify({ token: 'wrong' })),
      res as unknown as ServerResponse,
    )
    expect(res.statusCode).toBe(401)
    expect(emit).not.toHaveBeenCalled()
  })
})
