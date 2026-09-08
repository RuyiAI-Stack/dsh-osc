export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export function authorizeZulipBody(
  body: Record<string, unknown>,
  expectedToken: string,
  botEmail?: string,
): Record<string, unknown> {
  if (typeof body.token !== 'string' || body.token !== expectedToken) throw new HttpError('unauthorized', 401)
  if (botEmail !== undefined && body.bot_email !== botEmail) throw new HttpError('unauthorized', 401)
  const { token: _token, ...payload } = body
  return payload
}
