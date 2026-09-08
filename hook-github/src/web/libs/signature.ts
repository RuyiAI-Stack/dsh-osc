import { createHmac, timingSafeEqual } from 'node:crypto'

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export function verifyGithubSignature(secret: Buffer, body: Buffer, signature: string): boolean {
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
  const actual = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer)
}
