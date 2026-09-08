import type { OrgConfig } from '../../config.ts'

export async function githubRequest(
  config: OrgConfig,
  token: string,
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const headers = new Headers(init?.headers)
  headers.set('accept', 'application/vnd.github+json')
  headers.set('authorization', `Bearer ${token}`)
  headers.set('content-type', 'application/json')
  headers.set('x-github-api-version', '2022-11-28')
  const response = await fetch(`${config.apiBaseUrl ?? 'https://api.github.com'}${path}`, { ...init, headers })
  const text = await response.text()
  if (!response.ok) throw new Error(`github-bot: GitHub API ${response.status}: ${text}`)
  return text.length === 0 ? null : JSON.parse(text)
}
