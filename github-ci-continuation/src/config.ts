import z from '@deepseek-ai/schemastery'

export interface Config {
  /** `hook/github` delivery source this dispatcher accepts. */
  source: string
  /** GitHub `owner/repo` this rule acts on. */
  repository: string
  /** GitHub `owner/repo` → absolute workspace checkout path. */
  workspaces: Record<string, string>
  /** Agent preset mounted onto every created task Session. */
  agentPreset: string
  /** Permission preset applied to every created task Session. */
  permissionPreset: string
  /** Maximum auto-fix Sessions per PR before escalating to a maintainer. */
  maxIterations: number
}

export const Config: z<Config> = z.object({
  source: z.string().default('osc-github'),
  repository: z.string().default(''),
  workspaces: z.dict(z.string()).default({}),
  agentPreset: z.string().default('cordis'),
  permissionPreset: z.string().default('workspace-write'),
  maxIterations: z.number().default(3),
})
