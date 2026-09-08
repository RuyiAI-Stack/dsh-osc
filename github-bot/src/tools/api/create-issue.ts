import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Config } from '../../config.ts'
import { assertOrgRepo } from '../libs/commit.ts'
import { createInstallationToken } from '../libs/token.ts'
import { githubRequest } from '../libs/api.ts'

export interface CreateIssueInput {
  org: string
  repo: string
  title: string
  body: string
}

export interface CreateIssueResult {
  number: number
  url: string
  repo: string
  title: string
}

export async function createIssue(
  config: Config,
  input: CreateIssueInput,
): Promise<CreateIssueResult> {
  const orgConfig = assertOrgRepo(input, config.orgs)
  const [owner, repo] = input.repo.split('/')
  const { token } = await createInstallationToken(input.org, orgConfig)
  const issue = (await githubRequest(orgConfig, token, `/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    body: JSON.stringify({ title: input.title, body: input.body }),
  })) as { number: number; html_url: string; title: string }
  return { number: issue.number, url: issue.html_url, repo: input.repo, title: issue.title }
}

export function defineCreateIssueTool(bot: { readonly config: Config }) {
  return defineTool({
    name: 'github_bot_create_issue',
    description: 'Open a GitHub issue in a repository as the configured GitHub App.',
    parameters: {
      org: { type: 'string', required: true },
      repo: { type: 'string', required: true, description: 'Repository in owner/name form.' },
      title: { type: 'string', required: true },
      body: { type: 'string', required: true },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          number: { type: 'number', required: true },
          url: { type: 'string', required: true },
          repo: { type: 'string', required: true },
          title: { type: 'string', required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    execute: async args => createIssue(bot.config, args as CreateIssueInput),
  })
}
