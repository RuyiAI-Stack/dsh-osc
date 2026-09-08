import type { IncomingMessage, ServerResponse } from 'node:http'
import type { RepoListStore } from '../../service/repoList.ts'
import { isRepoRef } from '../../tools/libs/repo-ref.ts'

// API: integrations/role/repos
export async function handleRepos(
  store: RepoListStore,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    if (req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
      res.end(JSON.stringify(store.load()))
      return
    }
    if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'DELETE') {
      res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('method not allowed')
      return
    }
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(Buffer.from(chunk))
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { repo?: unknown }
    if (!isRepoRef(body.repo)) {
      throw new Error('role: bad repo ' + String(body.repo) + '; expected owner/name with safe path segments')
    }
    const repos = store.load()
    if (req.method === 'DELETE') store.save(repos.filter(repo => repo !== body.repo))
    else if (!repos.includes(body.repo)) store.save([...repos, body.repo])
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(JSON.stringify(store.load()))
  } catch (err) {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(err instanceof Error ? err.message : String(err))
  }
}
