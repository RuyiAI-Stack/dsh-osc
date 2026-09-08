import z from '@deepseek-ai/schemastery'

export interface Config {
  secret: string
}

export const Config: z<Config> = z.object({
  secret: z.string().required(),
})

export const PATH = '/integrations/hook-github'
