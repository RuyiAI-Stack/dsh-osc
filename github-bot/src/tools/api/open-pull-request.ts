import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Config } from '../../config.ts'
import { assertOrgRepo } from '../libs/commit.ts'
import { createInstallationToken } from '../libs/token.ts'
import { githubRequest } from '../libs/api.ts'

export interface OpenPullRequestInput {
  org: string
  repo: string
  base: string
  head: string
  title: string
  body: string
}

export interface OpenPullRequestResult {
  number: number
  url: string
  head: string
  base: string
  repo: string
}

export async function openPullRequest(
  config: Config,
  input: OpenPullRequestInput,
): Promise<OpenPullRequestResult> {
  const orgConfig = assertOrgRepo(input, config.orgs)
  const [owner, repo] = input.repo.split('/')
  const { token } = await createInstallationToken(input.org, orgConfig)
  const pull = (await githubRequest(orgConfig, token, `/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title: input.title,
      body: input.body,
      head: input.head,
      base: input.base,
    }),
  })) as { number: number; html_url: string }
  return {
    number: pull.number,
    url: pull.html_url,
    head: input.head,
    base: input.base,
    repo: input.repo,
  }
}

export function defineOpenPullRequestTool(bot: { readonly config: Config }) {
  return defineTool({
    name: 'github_bot_open_pull_request',
    description:
      'Open a pull request for an existing head branch. Use after github_bot_commit (or any existing branch).',
    parameters: {
      org: { type: 'string', required: true },
      repo: { type: 'string', required: true, description: 'Repository in owner/name form.' },
      base: { type: 'string', required: true },
      head: { type: 'string', required: true, description: 'Head branch name.' },
      title: { type: 'string', required: true },
      body: { type: 'string', required: true },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          number: { type: 'number', required: true },
          url: { type: 'string', required: true },
          head: { type: 'string', required: true },
          base: { type: 'string', required: true },
          repo: { type: 'string', required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    execute: async args => openPullRequest(bot.config, args as OpenPullRequestInput),
  })
}
