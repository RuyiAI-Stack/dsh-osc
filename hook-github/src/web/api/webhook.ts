import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { Config } from '../../config.ts'
import { HttpError, verifyGithubSignature } from '../libs/signature.ts'

export interface HookEvent {
  delivery: string
  event: string
  payload: unknown
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}

export async function handleWebhook(
  ctx: Context,
  config: Config,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.writeHead(405)
    res.end()
    return
  }

  const signature = req.headers['x-hub-signature-256']
  if (typeof signature !== 'string') throw new HttpError('missing GitHub signature', 401)

  const body = await readBody(req)
  if (!verifyGithubSignature(Buffer.from(config.secret), body, signature)) {
    throw new HttpError('invalid GitHub signature', 401)
  }

  const delivery = req.headers['x-github-delivery']
  const event = req.headers['x-github-event']
  if (typeof delivery !== 'string' || typeof event !== 'string') {
    throw new HttpError('missing GitHub event headers', 400)
  }

  let payload: unknown
  try {
    payload = JSON.parse(body.toString('utf8'))
  } catch {
    throw new HttpError('invalid JSON', 400)
  }

  ctx.emit('hook/github', { delivery, event, payload })
  res.writeHead(204)
  res.end()
}
