export interface Config {
  clientId: string
  scopes: string
  apiBaseUrl: string
  oauthBaseUrl: string
}

export type GrantPayload = { accessToken: string }
