import { createHmac } from 'node:crypto'
import { EventEmitter } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import type { Config } from '../../../src/config.ts'
import { handleWebhook } from '../../../src/web/api/webhook.ts'
import { HttpError } from '../../../src/web/libs/signature.ts'

function mockRes() {
  const chunks: string[] = []
  return {
    statusCode: 0,
    body: '',
    writeHead(code: number) {
      this.statusCode = code
    },
    end(chunk?: string | Buffer) {
      if (chunk !== undefined) chunks.push(String(chunk))
      this.body = chunks.join('')
    },
  }
}

function mockReq(method: string, headers: Record<string, string>, body?: string): IncomingMessage {
  const req = new EventEmitter() as IncomingMessage & EventEmitter
  req.method = method
  req.headers = headers
  ;(req as IncomingMessage & { [Symbol.asyncIterator]: () => AsyncIterator<Buffer> })[Symbol.asyncIterator] =
    async function* () {
      if (body !== undefined) yield Buffer.from(body)
    }
  return req
}

describe('handleWebhook', () => {
  const emit = vi.fn()
  const config: Config = { secret: 'inline-secret' }

  it('rejects non-POST', async () => {
    const res = mockRes()
    await handleWebhook({ emit } as never, config, mockReq('GET', {}), res as unknown as ServerResponse)
    expect(res.statusCode).toBe(405)
  })

  it('verifies signature and emits hook/github', async () => {
    const body = '{"ok":true}'
    const signature =
      'sha256=' + createHmac('sha256', Buffer.from(config.secret)).update(body).digest('hex')
    const res = mockRes()
    await handleWebhook(
      { emit } as never,
      config,
      mockReq(
        'POST',
        {
          'x-hub-signature-256': signature,
          'x-github-delivery': 'd1',
          'x-github-event': 'push',
        },
        body,
      ),
      res as unknown as ServerResponse,
    )
    expect(res.statusCode).toBe(204)
    expect(emit).toHaveBeenCalledWith('hook/github', {
      delivery: 'd1',
      event: 'push',
      payload: { ok: true },
    })
  })

  it('throws on invalid signature', async () => {
    const res = mockRes()
    await expect(
      handleWebhook(
        { emit } as never,
        config,
        mockReq(
          'POST',
          {
            'x-hub-signature-256': 'sha256=deadbeef',
            'x-github-delivery': 'd1',
            'x-github-event': 'push',
          },
          '{}',
        ),
        res as unknown as ServerResponse,
      ),
    ).rejects.toThrow(HttpError)
  })
})
