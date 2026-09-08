import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { Config } from '../../config.ts'
import { authorizeZulipBody, HttpError } from '../libs/auth.ts'

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

export async function handleWebhook(
  ctx: Context,
  config: Config,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    if (req.method !== 'POST') {
      res.writeHead(405, { allow: 'POST', 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: 'method not allowed' }))
      return
    }

    let body: Record<string, unknown>
    try {
      const parsed: unknown = JSON.parse(await readBody(req))
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('object required')
      body = parsed as Record<string, unknown>
    } catch {
      res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: 'invalid json' }))
      return
    }

    const payload = authorizeZulipBody(body, config.token, config.botEmail)
    ctx.emit('hook/zulip', payload)
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ response_not_required: true }))
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
  }
}
