export type Path = 'pr' | 'bot'

export interface PrTarget {
  readonly repo: string
  readonly number: number
}

export interface BotTarget {
  readonly sessionId: string
}

export interface SendToPrRequest extends PrTarget {
  readonly body: string
}

export interface SendToBotRequest extends BotTarget {
  readonly body: string
}

export type SendRequest =
  | { readonly path: 'pr'; readonly target: PrTarget; readonly body: string }
  | { readonly path: 'bot'; readonly target: BotTarget; readonly body: string }

export interface PrSendResult {
  readonly path: 'pr'
  readonly target: PrTarget
  readonly commentId: number
  readonly url: string
}

export interface BotSendResult {
  readonly path: 'bot'
  readonly target: BotTarget
}

export type SendResult = PrSendResult | BotSendResult

export interface PathEvent {
  readonly path: Path
  readonly target: PrTarget | BotTarget
}

export interface SentEvent extends PathEvent {
  readonly result: SendResult
}
