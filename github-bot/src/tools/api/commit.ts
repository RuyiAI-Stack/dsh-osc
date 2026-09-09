import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Config } from '../../config.ts'
import { assertCommitInput } from '../libs/commit.ts'
import { createInstallationToken } from '../libs/token.ts'
import { githubRequest } from '../libs/api.ts'

export interface CommitChange {
  path: string
  content: string
}

export interface CommitInput {
  org: string
  repo: string
  base: string
  branch: string
  message: string
  changes: CommitChange[]
}

export interface CommitResult {
  commitSha: string
  branch: string
  base: string
  repo: string
}

export async function commitBranch(config: Config, input: CommitInput): Promise<CommitResult> {
  const orgConfig = assertCommitInput(input, config.orgs)
  const [owner, repo] = input.repo.split('/')
  const { token } = await createInstallationToken(input.org, orgConfig)
  const request = (path: string, init?: RequestInit) => githubRequest(orgConfig, token, path, init)

  const branchPath = `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(input.branch)}`

  // The parent is the existing branch head when updating, or `base` when creating.
  let parentSha: string
  let updating = false
  try {
    const branchRef = (await request(branchPath)) as { object: { sha: string } }
    parentSha = branchRef.object.sha
    updating = true
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith('github-bot: GitHub API 404:')) throw error
    const baseRef = (await request(
      `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(input.base)}`,
    )) as { object: { sha: string } }
    parentSha = baseRef.object.sha
  }
  const parent = (await request(`/repos/${owner}/${repo}/git/commits/${parentSha}`)) as {
    tree: { sha: string }
  }
  const blobs = await Promise.all(
    input.changes.map(async change => {
      const blob = (await request(`/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content: change.content, encoding: 'utf-8' }),
      })) as { sha: string }
      return { path: change.path, mode: '100644', type: 'blob', sha: blob.sha }
    }),
  )
  const tree = (await request(`/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: parent.tree.sha, tree: blobs }),
  })) as { sha: string }
  const commit = (await request(`/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message: input.message, tree: tree.sha, parents: [parentSha] }),
  })) as { sha: string }
  if (updating) {
    // Fast-forward the existing branch head onto the new commit. The new commit's
    // parent is the previous head, so `force: false` never rewrites history.
    await request(branchPath, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commit.sha, force: false }),
    })
  } else {
    await request(`/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${input.branch}`, sha: commit.sha }),
    })
  }
  return { commitSha: commit.sha, branch: input.branch, base: input.base, repo: input.repo }
}

export function defineCommitTool(bot: { readonly config: Config }) {
  return defineTool({
    name: 'github_bot_commit',
    description:
      'Commit file changes onto a branch with the configured GitHub App. Creates the branch when it does not exist; otherwise appends a fast-forward commit to the existing branch head.',
    parameters: {
      org: { type: 'string', required: true },
      repo: { type: 'string', required: true, description: 'Repository in owner/name form.' },
      base: { type: 'string', required: true, description: 'Parent branch used only when the target branch does not exist yet.' },
      branch: { type: 'string', required: true },
      message: { type: 'string', required: true },
      changes: {
        type: 'array',
        required: true,
        items: {
          type: 'object',
          properties: {
            path: { type: 'string', required: true },
            content: { type: 'string', required: true },
          },
          additionalProperties: false,
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          commitSha: { type: 'string', required: true },
          branch: { type: 'string', required: true },
          base: { type: 'string', required: true },
          repo: { type: 'string', required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    execute: async args => commitBranch(bot.config, args as CommitInput),
  })
}
