import type { Context } from '@deepseek-ai/cordis'
import {
  issueSearchQuery,
  mapDetail,
  mapSearchItem,
  prSearchQuery,
  type BoardDetail,
  type BoardEntry,
} from './board.ts'

export async function listItems(ctx: Context): Promise<BoardEntry[]> {
  const identity = await ctx.role.whoami()
  const permissionErrors = identity.errors
  const items: BoardEntry[] = []
  for (const repo of ctx.role.repoList) {
    const permissionError = permissionErrors[repo]
    if (permissionError) {
      items.push({ repo, kind: 'error', message: permissionError.message })
      continue
    }
    try {
      for (const [kind, q] of [
        ['issue', issueSearchQuery(repo, identity.login)],
        ['pr', prSearchQuery(repo, identity.login)],
      ] as const) {
        const body: any = await ctx.role.githubJson(`/search/issues?q=${encodeURIComponent(q)}&per_page=50`)
        for (const raw of body.items) items.push(mapSearchItem(raw, kind))
      }
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'GitHubHttpError') throw error
      const status = (error as Error & { status?: unknown }).status
      if (status !== 403 && status !== 404) throw error
      items.push({ repo, kind: 'error', message: error.message })
    }
  }
  items.sort((a, b) => {
    if (a.kind === 'error') return b.kind === 'error' ? a.repo.localeCompare(b.repo) : -1
    if (b.kind === 'error') return 1
    return b.updatedAt.localeCompare(a.updatedAt)
  })
  return items
}

export async function getDetail(ctx: Context, repo: string, number: number): Promise<BoardDetail> {
  if (!ctx.role.repoList.includes(repo)) throw new Error(`collaboration-panel: unknown repo ${repo}`)
  const [owner, name_] = repo.split('/')
  const issue: any = await ctx.role.githubJson(`/repos/${owner}/${name_}/issues/${number}`)
  if (issue.pull_request) {
    const pr: any = await ctx.role.githubJson(`/repos/${owner}/${name_}/pulls/${number}`)
    return mapDetail(pr, repo, 'pr')
  }
  return mapDetail(issue, repo, 'issue')
}
