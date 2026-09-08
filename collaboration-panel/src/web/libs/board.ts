export type Kind = 'issue' | 'pr'

export interface BoardItem {
  repo: string
  kind: Kind
  number: number
  title: string
  author: string
  updatedAt: string
  url: string
}

export interface BoardError {
  repo: string
  kind: 'error'
  message: string
}

export type BoardEntry = BoardItem | BoardError

export interface BoardDetail extends BoardItem {
  state: string
  body: string
  labels: string[]
  assignees: string[]
  requestedReviewers: string[]
}

export function issueSearchQuery(repo: string, login: string): string {
  return `repo:${repo} is:issue is:open assignee:${login}`
}

export function prSearchQuery(repo: string, login: string): string {
  return `repo:${repo} is:pr is:open review-requested:${login}`
}

export function mapSearchItem(raw: any, kind: Kind): BoardItem {
  const m = String(raw.repository_url).match(/\/repos\/([^/]+\/[^/]+)$/)
  if (!m) throw new Error(`collaboration-panel: bad repository_url ${raw.repository_url}`)
  return {
    repo: m[1],
    kind,
    number: raw.number,
    title: raw.title,
    author: raw.user.login,
    updatedAt: raw.updated_at,
    url: raw.html_url,
  }
}

export function mapDetail(raw: any, repo: string, kind: Kind): BoardDetail {
  return {
    repo,
    kind,
    number: raw.number,
    title: raw.title,
    author: raw.user.login,
    updatedAt: raw.updated_at,
    url: raw.html_url,
    state: raw.state,
    body: raw.body == null ? '' : raw.body,
    labels: raw.labels.map((l: any) => l.name),
    assignees: raw.assignees.map((a: any) => a.login),
    requestedReviewers: kind === 'pr' ? raw.requested_reviewers.map((r: any) => r.login) : [],
  }
}
