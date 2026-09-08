import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Config } from '../../config.ts'
import { assertOrgRepo } from '../libs/commit.ts'
import { createInstallationToken } from '../libs/token.ts'
import { githubRequest } from '../libs/api.ts'

export interface CreateCommentInput {
  org: string
  repo: string
  number: number
  body: string
}

export interface CreateCommentResult {
  commentId: number
  url: string
  repo: string
}

export async function createComment(
  config: Config,
  input: CreateCommentInput,
): Promise<CreateCommentResult> {
  const orgConfig = assertOrgRepo(input, config.orgs)
  const [owner, repo] = input.repo.split('/')
  if (!Number.isSafeInteger(input.number) || input.number <= 0) {
    throw new Error('github-bot: issue or pull request number must be positive')
  }
  if (typeof input.body !== 'string' || input.body.length === 0) {
    throw new Error('github-bot: body is required')
  }
  const { token } = await createInstallationToken(input.org, orgConfig)
  const comment = (await githubRequest(
    orgConfig,
    token,
    `/repos/${owner}/${repo}/issues/${input.number}/comments`,
    { method: 'POST', body: JSON.stringify({ body: input.body }) },
  )) as { id?: unknown; html_url?: unknown }
  if (!Number.isSafeInteger(comment.id) || typeof comment.html_url !== 'string' || comment.html_url.length === 0) {
    throw new Error('github-bot: GitHub comment response is missing id or html_url')
  }
  return { commentId: comment.id as number, url: comment.html_url, repo: input.repo }
}

export function defineCreateCommentTool(bot: { readonly config: Config }) {
  return defineTool({
    name: 'github_bot_create_comment',
    description: 'Post a comment on a GitHub issue or pull request as the configured GitHub App.',
    parameters: {
      org: { type: 'string', required: true },
      repo: { type: 'string', required: true, description: 'Repository in owner/name form.' },
      number: { type: 'number', required: true, description: 'Issue or pull request number.' },
      body: { type: 'string', required: true },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          commentId: { type: 'number', required: true },
          url: { type: 'string', required: true },
          repo: { type: 'string', required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    execute: async args => createComment(bot.config, args as CreateCommentInput),
  })
}
