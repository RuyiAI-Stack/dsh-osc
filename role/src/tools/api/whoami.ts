import { defineTool } from '@deepseek-ai/dsh-tools'
import { GitHubHttpError, githubJson, type RoleHost } from '../libs/github.ts'
import { isMaintainer, parsePermission } from '../libs/permissions.ts'

export interface WhoamiResult {
  login: string
  maintainers: Record<string, boolean>
  errors: Record<string, { status: number; message: string }>
}

export async function whoami(role: RoleHost): Promise<WhoamiResult> {
  const user = (await githubJson(role, '/user')) as { login?: unknown }
  if (typeof user.login !== 'string' || user.login.length === 0) throw new Error('role: /user missing login')
  const maintainers: Record<string, boolean> = {}
  const errors: WhoamiResult['errors'] = {}
  for (const repo of role.repoList) {
    const [owner, name] = repo.split('/')
    try {
      const body = await githubJson(role, `/repos/${owner}/${name}/collaborators/${user.login}/permission`)
      maintainers[repo] = isMaintainer(parsePermission(body))
    } catch (error) {
      if (!(error instanceof GitHubHttpError) || (error.status !== 403 && error.status !== 404)) throw error
      errors[repo] = { status: error.status, message: error.message }
    }
  }
  return { login: user.login, maintainers, errors }
}

export function defineWhoamiTool(role: RoleHost) {
  return defineTool({
    name: 'role_whoami',
    description: 'Return GitHub login and maintainer map for configured repos. Throws if not logged in.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        properties: {
          login: { type: 'string', required: true },
          maintainers: { type: 'json', required: true },
          errors: { type: 'json', required: true },
        },
        additionalProperties: false,
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    execute: async () => whoami(role),
  })
}
