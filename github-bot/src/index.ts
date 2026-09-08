/**
 * GitHub App tools for commit and open pull request.
 * @module dsh-osc-github-bot
 */

import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { Config } from './config.ts'
import { defineCommitTool } from './tools/api/commit.ts'
import { defineOpenPullRequestTool } from './tools/api/open-pull-request.ts'

export type { Config, OrgConfig } from './config.ts'
export { assertCommitInput, assertOrgRepo } from './tools/libs/commit.ts'
export { commitBranch } from './tools/api/commit.ts'
export type { CommitChange, CommitInput, CommitResult } from './tools/api/commit.ts'
export { openPullRequest } from './tools/api/open-pull-request.ts'
export type { OpenPullRequestInput, OpenPullRequestResult } from './tools/api/open-pull-request.ts'

export default class GitHubBot extends Service {
  static inject = ['tools']
  static Config: z<Config> = Config

  declare readonly config: Config

  constructor(ctx: Context, config: Config) {
    super(ctx, 'githubBot')
    this.config = config
    ctx.tools.register(defineCommitTool(this))
    ctx.tools.register(defineOpenPullRequestTool(this))
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    githubBot: GitHubBot
  }
}
