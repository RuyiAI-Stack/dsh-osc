import type { Context } from '@deepseek-ai/cordis'
import type { AuthorizationInteraction, AuthorizationSession } from '@deepseek-ai/dsh-authorization'
import { KEY } from '../../constants.ts'
import type { Config, GrantPayload } from '../../config.ts'

export interface RoleHost {
  readonly ctx: Context
  readonly config: Config
  readonly repoList: readonly string[]
}

export class GitHubHttpError extends Error {
  readonly status: number

  constructor(status: number, body: string) {
    super(`GitHub ${status}: ${body}`)
    this.name = 'GitHubHttpError'
    this.status = status
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('aborted'))
      return
    }
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason ?? new Error('aborted'))
      },
      { once: true },
    )
  })
}

export async function login(
  role: RoleHost,
  interaction: AuthorizationInteraction,
  signal?: AbortSignal,
): Promise<{ login: string }> {
  const outcome = await role.ctx.authorization.begin({ key: KEY, method: 'oauth', interaction, signal })
  if (outcome.status !== 'authorized') throw new Error(`role: login ${outcome.status}`)
  const user = (await githubJson(role, '/user')) as { login?: unknown }
  if (typeof user.login !== 'string' || user.login.length === 0) throw new Error('role: /user missing login')
  return { login: user.login }
}

export async function githubJson(role: RoleHost, path: string, init?: RequestInit): Promise<unknown> {
  const accessToken = await githubAccessToken(role)
  const url = `${role.config.apiBaseUrl.replace(/\/+$/, '')}${path}`
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/vnd.github+json')
  headers.set('Authorization', `Bearer ${accessToken}`)
  headers.set('X-GitHub-Api-Version', '2022-11-28')
  headers.set('User-Agent', 'dsh-role')
  const response = await fetch(url, { ...init, headers })
  const text = await response.text()
  if (!response.ok) throw new GitHubHttpError(response.status, text)
  return text.length === 0 ? null : JSON.parse(text)
}

export async function githubCloneUrl(role: RoleHost, repo: string): Promise<string> {
  const accessToken = await githubAccessToken(role)
  const configuredApi = new URL(role.config.apiBaseUrl)
  const configuredOauth = new URL(role.config.oauthBaseUrl)
  const host =
    configuredOauth.hostname === 'github.com' && configuredApi.hostname !== 'api.github.com'
      ? configuredApi.origin
      : configuredOauth.origin
  const url = new URL(`${host}/${repo}.git`)
  url.username = 'x-access-token'
  url.password = accessToken
  return url.toString()
}

async function githubAccessToken(role: RoleHost): Promise<string> {
  const record = await role.ctx.credentials.readRecord(KEY)
  if (record === undefined) throw new Error('not logged in')
  if (record.kind !== 'grant') throw new Error('role: credential is not a grant')
  const payload = record.payload as GrantPayload
  if (typeof payload?.accessToken !== 'string' || payload.accessToken.length === 0) {
    throw new Error('role: grant missing accessToken')
  }
  return payload.accessToken
}

export async function runDeviceFlow(role: RoleHost, session: AuthorizationSession): Promise<void> {
  const base = role.config.oauthBaseUrl.replace(/\/+$/, '')
  const codeResponse = await fetch(`${base}/login/device/code`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: role.config.clientId, scope: role.config.scopes }),
    signal: session.signal,
  })
  const codeBody = (await codeResponse.json()) as Record<string, unknown>
  if (!codeResponse.ok) throw new Error(`role: device code HTTP ${codeResponse.status}: ${JSON.stringify(codeBody)}`)
  const deviceCode = codeBody.device_code
  const userCode = codeBody.user_code
  const verificationUri = codeBody.verification_uri
  let interval = Number(codeBody.interval ?? 5)
  const expiresIn = Number(codeBody.expires_in)
  if (typeof deviceCode !== 'string' || typeof userCode !== 'string' || typeof verificationUri !== 'string') {
    throw new Error(`role: bad device code response: ${JSON.stringify(codeBody)}`)
  }
  if (!Number.isFinite(interval) || interval <= 0 || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error(`role: bad device code timing: ${JSON.stringify(codeBody)}`)
  }
  session.notify({
    message: 'Enter this code on the verification page to finish signing in.',
    url: verificationUri,
    code: userCode,
  })
  const deadline = Date.now() + expiresIn * 1000
  while (Date.now() < deadline) {
    await sleep(interval * 1000, session.signal)
    const tokenResponse = await fetch(`${base}/login/oauth/access_token`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: role.config.clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
      signal: session.signal,
    })
    const tokenBody = (await tokenResponse.json()) as Record<string, unknown>
    if (typeof tokenBody.access_token === 'string' && tokenBody.access_token.length > 0) {
      await role.ctx.credentials.modifyRecord(KEY, async () => ({
        kind: 'grant',
        payload: { accessToken: tokenBody.access_token },
      }))
      return
    }
    if (tokenBody.error === 'authorization_pending') continue
    if (tokenBody.error === 'slow_down') {
      interval += 5
      continue
    }
    if (tokenBody.error === 'access_denied' || tokenBody.error === 'expired_token') {
      throw new Error(`role: device flow ${tokenBody.error}`)
    }
    throw new Error(`role: device flow poll failed: ${JSON.stringify(tokenBody)}`)
  }
  throw new Error('role: device flow expired')
}
