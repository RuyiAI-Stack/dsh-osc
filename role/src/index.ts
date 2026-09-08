/**
 * GitHub identity and repoList for OSC.
 * @module dsh-osc-role
 */

import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { AuthorizationInteraction } from '@deepseek-ai/dsh-authorization'
import { KEY } from './constants.ts'
import type { Config } from './config.ts'
import { RepoListStore } from './service/repoList.ts'
import { defineWhoamiTool, whoami as runWhoami, type WhoamiResult } from './tools/api/whoami.ts'
import { githubCloneUrl, githubJson, login, runDeviceFlow } from './tools/libs/github.ts'
import { handleLogin } from './web/api/login.ts'
import { handleRepos } from './web/api/repos.ts'

export { KEY } from './constants.ts'
export type { Config } from './config.ts'
export { isRepoRef } from './tools/libs/repo-ref.ts'
export { isMaintainer, parsePermission } from './tools/libs/permissions.ts'
export { whoami } from './tools/api/whoami.ts'
export type { WhoamiResult } from './tools/api/whoami.ts'
export { githubCloneUrl, githubJson, login } from './tools/libs/github.ts'
export type { RoleHost } from './tools/libs/github.ts'
export { RepoListStore } from './service/repoList.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    role: Role
  }
}

export default class Role extends Service {
  static inject = ['tools', 'authorization', 'credentials', 'webServer']
  static Config: z<Config> = z.object({
    clientId: z.string().default('Ov23lixMRqTArZkZ92EI'),
    scopes: z.string().default('read:user repo'),
    apiBaseUrl: z.string().default('https://api.github.com'),
    oauthBaseUrl: z.string().default('https://github.com'),
  })

  readonly config: Config
  private readonly repos: RepoListStore

  get repoList(): readonly string[] {
    return this.repos.load()
  }

  constructor(ctx: Context, config: Config) {
    super(ctx, 'role')
    this.config = config
    const dshHome = process.env.DSH_HOME
    if (!dshHome) throw new Error('role: DSH_HOME required')
    this.repos = new RepoListStore(dshHome)

    ctx.authorization.registerFlow({
      key: KEY,
      label: 'GitHub (role)',
      methods: [{ id: 'oauth', label: 'Sign in with GitHub' }],
      run: async session => runDeviceFlow(this, session),
    })

    ctx.tools.register(defineWhoamiTool(this))

    ctx.effect(
      () =>
        ctx.webServer.register({
          kind: 'exact',
          path: '/integrations/role/login',
          handler: (req, res) => void handleLogin(this.login.bind(this), req, res),
        }),
      'role: login',
    )

    ctx.effect(
      () =>
        ctx.webServer.register({
          kind: 'exact',
          path: '/integrations/role/repos',
          handler: (req, res) => void handleRepos(this.repos, req, res),
        }),
      'role: repos',
    )
  }

  async login(interaction: AuthorizationInteraction, signal?: AbortSignal): Promise<{ login: string }> {
    return login(this, interaction, signal)
  }

  async whoami(): Promise<WhoamiResult> {
    return runWhoami(this)
  }

  async githubJson(path: string, init?: RequestInit): Promise<unknown> {
    return githubJson(this, path, init)
  }

  async githubCloneUrl(repo: string): Promise<string> {
    return githubCloneUrl(this, repo)
  }
}
