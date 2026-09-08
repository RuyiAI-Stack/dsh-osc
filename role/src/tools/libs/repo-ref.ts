const SAFE_REPO_SEGMENT = /^[A-Za-z0-9._-]+$/

export function isRepoRef(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const parts = value.split('/')
  return parts.length === 2 && parts.every(part => part !== '.' && part !== '..' && SAFE_REPO_SEGMENT.test(part))
}
