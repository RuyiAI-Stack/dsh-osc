import z from '@deepseek-ai/schemastery'

export interface OrgConfig {
  appId: number
  privateKeyFile: string
  apiBaseUrl?: string
}

export interface Config {
  orgs: Record<string, OrgConfig>
}

export const Config: z<Config> = z.object({
  orgs: z.dict(z.object({
    appId: z.number(),
    privateKeyFile: z.string(),
    apiBaseUrl: z.string().default('https://api.github.com'),
  })),
})
