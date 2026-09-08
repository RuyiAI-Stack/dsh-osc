import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AuthorizationInteraction } from '@deepseek-ai/dsh-authorization'

type LoginFn = (
  interaction: AuthorizationInteraction,
  signal?: AbortSignal,
) => Promise<{ login: string }>

// API: integrations/role/login
export async function handleLogin(
  login: LoginFn,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('POST only')
    return
  }
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store',
    connection: 'keep-alive',
  })
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }
  const ac = new AbortController()
  req.on('close', () => ac.abort())
  try {
    const { login: userLogin } = await login(
      {
        notify: n => send('notice', n),
        prompt: async () => {
          throw new Error('role: device flow does not prompt')
        },
      },
      ac.signal,
    )
    send('done', { login: userLogin })
  } catch (err) {
    send('error', { message: err instanceof Error ? err.message : String(err) })
  }
  res.end()
}
