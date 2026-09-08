import { readFileSync } from 'node:fs'
import { createSign } from 'node:crypto'
import type { OrgConfig } from '../../config.ts'

export interface InstallationToken {
  token: string
  expiresAt: string
}

export function readPrivateKey(path: string): string {
  if (!path) throw new Error('github-bot: privateKeyFile is required')
  try {
    const pem = readFileSync(path, 'utf8')
    if (!pem) throw new Error('private key file is empty')
    return pem
  } catch (error) {
    throw new Error(`github-bot: cannot read private key file ${path}`, { cause: error })
  }
}

export function createAppJwt(appId: number, pem: string): string {
  const now = Math.floor(Date.now() / 1000)
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const header = encode({ alg: 'RS256', typ: 'JWT' })
  const payload = encode({ iat: now - 60, exp: now + 540, iss: appId })
  const signingInput = `${header}.${payload}`
  const signature = createSign('RSA-SHA256').update(signingInput).end().sign(pem).toString('base64url')
  return `${signingInput}.${signature}`
}

function apiHeaders(jwt: string): HeadersInit {
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${jwt}`,
    'x-github-api-version': '2022-11-28',
  }
}

function nextPage(link: string | null): string | undefined {
  if (!link) return undefined
  for (const part of link.split(',')) {
    const match = part.trim().match(/^<([^>]+)>;\s*rel="next"$/)
    if (match) return match[1]
  }
  return undefined
}

export async function resolveInstallationId(org: string, config: OrgConfig): Promise<number> {
  const jwt = createAppJwt(config.appId, readPrivateKey(config.privateKeyFile))
  const base = config.apiBaseUrl ?? 'https://api.github.com'
  let url: string | undefined = `${base}/app/installations?per_page=100`
  const want = org.toLowerCase()
  while (url) {
    const response = await fetch(url, { headers: apiHeaders(jwt) })
    const body = await response.text()
    if (!response.ok) throw new Error(`github-bot: GitHub API ${response.status}: ${body}`)
    const list = JSON.parse(body) as Array<{ id: number; account?: { login?: string } }>
    for (const row of list) {
      const login = row.account?.login
      if (typeof login === 'string' && login.toLowerCase() === want) return row.id
    }
    url = nextPage(response.headers.get('link'))
  }
  throw new Error(`github-bot: no installation for org ${org}`)
}

export async function createInstallationToken(org: string, config: OrgConfig): Promise<InstallationToken> {
  const installationId = await resolveInstallationId(org, config)
  const jwt = createAppJwt(config.appId, readPrivateKey(config.privateKeyFile))
  const response = await fetch(
    `${config.apiBaseUrl ?? 'https://api.github.com'}/app/installations/${installationId}/access_tokens`,
    { method: 'POST', headers: apiHeaders(jwt) },
  )
  const body = await response.text()
  if (!response.ok) throw new Error(`github-bot: GitHub API ${response.status}: ${body}`)
  const result = JSON.parse(body) as { token: string; expires_at: string }
  return { token: result.token, expiresAt: result.expires_at }
}
