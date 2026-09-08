import type { Path } from './types.ts'

export function requireBody(body: string): void {
  if (typeof body !== 'string' || body.length === 0) throw new Error('pr-chat: body is required')
}

export function requireRepo(repo: string): [string, string] {
  if (typeof repo !== 'string') throw new Error('pr-chat: repo is required')
  const parts = repo.split('/')
  if (parts.length !== 2 || parts.some(part => part.length === 0 || part === '.' || part === '..')) {
    throw new Error('pr-chat: repo must be in owner/name form')
  }
  return parts as [string, string]
}

export function requireNumber(number: number): void {
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error('pr-chat: pull request number must be positive')
}

export function requireSessionId(sessionId: string): void {
  if (typeof sessionId !== 'string' || sessionId.length === 0) throw new Error('pr-chat: sessionId is required')
}

export function requirePath(path: string): asserts path is Path {
  if (path !== 'pr' && path !== 'bot') throw new Error(`pr-chat: invalid path ${String(path)}`)
}
