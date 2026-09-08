export function isMaintainer(permission: string): boolean {
  return permission === 'admin' || permission === 'maintain'
}

export function parsePermission(body: unknown): string {
  if (body === null || typeof body !== 'object') throw new Error('role: permission response is not an object')
  const permission = (body as { permission?: unknown }).permission
  if (typeof permission !== 'string' || permission.length === 0) throw new Error('role: permission field missing')
  return permission
}
