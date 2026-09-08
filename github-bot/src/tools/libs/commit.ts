import { isRepoRef } from '@ruyiAi/dsh-osc-role'
import type { OrgConfig } from '../../config.ts'

export function assertOrgRepo(
  input: { org: string; repo: string },
  orgs: Record<string, OrgConfig>,
): OrgConfig {
  if (!isRepoRef(input.repo)) throw new Error('github-bot: repo must be in owner/name form')
  const orgConfig = orgs[input.org]
  if (!orgConfig) throw new Error(`github-bot: unknown org ${input.org}`)
  return orgConfig
}

export function assertCommitInput(
  input: { org: string; repo: string; changes: { path: string; content: string }[] },
  orgs: Record<string, OrgConfig>,
): OrgConfig {
  const orgConfig = assertOrgRepo(input, orgs)
  if (!input.changes?.length) throw new Error('github-bot: changes must not be empty')
  return orgConfig
}
