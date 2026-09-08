/**
 * GitHub App tools for commit, open pull request, and create issue.
 * @module dsh-osc-github-bot
 */

import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { Config } from './config.ts'
import { defineCommitTool } from './tools/api/commit.ts'
import { createIssue as createGitHubIssue, defineCreateIssueTool } from './tools/api/create-issue.ts'
import type { CreateIssueInput, CreateIssueResult } from './tools/api/create-issue.ts'
import { defineOpenPullRequestTool } from './tools/api/open-pull-request.ts'

export type { Config, OrgConfig } from './config.ts'
export { assertCommitInput, assertOrgRepo } from './tools/libs/commit.ts'
export { commitBranch } from './tools/api/commit.ts'
export type { CommitChange, CommitInput, CommitResult } from './tools/api/commit.ts'
export { openPullRequest } from './tools/api/open-pull-request.ts'
export type { OpenPullRequestInput, OpenPullRequestResult } from './tools/api/open-pull-request.ts'
export { createIssue } from './tools/api/create-issue.ts'
export type { CreateIssueInput, CreateIssueResult } from './tools/api/create-issue.ts'

export default class GitHubBot extends Service {
  static inject = ['tools']
  static Config: z<Config> = Config

  declare readonly config: Config

  constructor(ctx: Context, config: Config) {
    super(ctx, 'githubBot')
    this.config = config
    ctx.tools.register(defineCommitTool(this))
    ctx.tools.register(defineOpenPullRequestTool(this))
    ctx.tools.register(defineCreateIssueTool(this))
  }

  /** Create a GitHub issue under the configured App installation. */
  createIssue(input: CreateIssueInput): Promise<CreateIssueResult> {
    return createGitHubIssue(this.config, input)
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    githubBot: GitHubBot
  }
}
