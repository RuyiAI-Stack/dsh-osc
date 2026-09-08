import { createHmac } from 'node:crypto'
import { EventEmitter } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { handleWebhook as handleGithub } from '../../hook-github/src/web/api/webhook.ts'
import { handleWebhook as handleZulip } from '../../hook-zulip/src/web/api/webhook.ts'

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

describe('hooks emit cordis events', () => {
  it('github webhook verifies HMAC and emits hook/github', async () => {
    const emit = vi.fn()
    const secret = 'integration-secret'
    const body = JSON.stringify({ ref: 'refs/heads/main' })
    const signature = 'sha256=' + createHmac('sha256', Buffer.from(secret)).update(body).digest('hex')
    const res = mockRes()
    await handleGithub(
      { emit } as never,
      { secret },
      mockReq(
        'POST',
        {
          'x-hub-signature-256': signature,
          'x-github-delivery': 'delivery-1',
          'x-github-event': 'push',
        },
        body,
      ),
      res as unknown as ServerResponse,
    )
    expect(res.statusCode).toBe(204)
    expect(emit).toHaveBeenCalledWith('hook/github', {
      delivery: 'delivery-1',
      event: 'push',
      payload: { ref: 'refs/heads/main' },
    })
  })

  it('zulip webhook authorizes token and emits hook/zulip', async () => {
    const emit = vi.fn()
    const token = 'zulip-token'
    const body = {
      token,
      bot_email: 'bot@example.com',
      data: 'hi',
      message: { type: 'stream' },
    }
    const res = mockRes()
    await handleZulip(
      { emit } as never,
      { token, botEmail: 'bot@example.com' },
      mockReq('POST', {}, JSON.stringify(body)),
      res as unknown as ServerResponse,
    )
    expect(res.statusCode).toBe(200)
    expect(emit).toHaveBeenCalledWith('hook/zulip', {
      bot_email: 'bot@example.com',
      data: 'hi',
      message: { type: 'stream' },
    })
  })
})
