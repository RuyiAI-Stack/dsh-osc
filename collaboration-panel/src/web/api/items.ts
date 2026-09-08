import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { getDetail, listItems } from '../libs/items.ts'

function write(res: ServerResponse, status: number, type: string, body: string) {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' })
  res.end(body)
}

export async function handleItems(ctx: Context, req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const pathname = new URL(req.url!, 'http://local').pathname
    if (pathname === '/integrations/collaboration-panel/items') {
      write(res, 200, 'application/json; charset=utf-8', JSON.stringify(await listItems(ctx)))
      return
    }
    const rest = pathname.slice('/integrations/collaboration-panel/items/'.length)
    const slash = rest.lastIndexOf('/')
    if (slash <= 0) throw new Error(`collaboration-panel: bad path ${pathname}`)
    const repo = decodeURIComponent(rest.slice(0, slash))
    const number = Number(rest.slice(slash + 1))
    if (!Number.isInteger(number)) throw new Error(`collaboration-panel: bad number ${pathname}`)
    write(res, 200, 'application/json; charset=utf-8', JSON.stringify(await getDetail(ctx, repo, number)))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    write(
      res,
      message.includes('not logged in') || message.startsWith('GitHub 401:') ? 401 : 500,
      'text/plain; charset=utf-8',
      message,
    )
  }
}
