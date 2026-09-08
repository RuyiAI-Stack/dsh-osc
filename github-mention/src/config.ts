import z from '@deepseek-ai/schemastery'

export interface Config {
  /** `hook/github` delivery source this dispatcher accepts. */
  source: string
  /** App login whose @mention opens a task (`@login` or `@login[bot]`). */
  login: string
  /** Logins whose own GitHub activity never opens a task (loop prevention). */
  botLogins: string[]
  /** GitHub `owner/repo` → absolute workspace checkout path. */
  workspaces: Record<string, string>
  /** Agent preset mounted onto every created task Session. */
  agentPreset: string
  /** Permission preset applied to every created task Session. */
  permissionPreset: string
}

export const Config: z<Config> = z.object({
  source: z.string().default('osc-github'),
  login: z.string().default('chipcrowd'),
  botLogins: z.array(z.string()).default(['chipcrowd[bot]', 'chipcrowd']),
  workspaces: z.dict(z.string()).default({}),
  agentPreset: z.string().default('cordis'),
  permissionPreset: z.string().default('workspace-write'),
})
