import z from '@deepseek-ai/schemastery'

export interface Config {
  token: string
  botEmail?: string
}

export const Config: z<Config> = z.object({
  token: z.string().required(),
  botEmail: z.string(),
})

export const PATH = '/integrations/hook-zulip'
