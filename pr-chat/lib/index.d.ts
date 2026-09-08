import { Context, Service } from "@deepseek-ai/cordis";
import "@deepseek-ai/dsh-tools";

//#region src/tools/libs/types.d.ts
type Path = 'pr' | 'bot';
interface PrTarget {
  readonly repo: string;
  readonly number: number;
}
interface BotTarget {
  readonly sessionId: string;
}
interface SendToPrRequest extends PrTarget {
  readonly body: string;
}
interface SendToBotRequest extends BotTarget {
  readonly body: string;
}
type SendRequest = {
  readonly path: 'pr';
  readonly target: PrTarget;
  readonly body: string;
} | {
  readonly path: 'bot';
  readonly target: BotTarget;
  readonly body: string;
};
interface PrSendResult {
  readonly path: 'pr';
  readonly target: PrTarget;
  readonly commentId: number;
  readonly url: string;
}
interface BotSendResult {
  readonly path: 'bot';
  readonly target: BotTarget;
}
type SendResult = PrSendResult | BotSendResult;
interface PathEvent {
  readonly path: Path;
  readonly target: PrTarget | BotTarget;
}
interface SentEvent extends PathEvent {
  readonly result: SendResult;
}
//#endregion
//#region src/tools/libs/send.d.ts
declare function send(ctx: Context, request: SendRequest): Promise<SendResult>;
//#endregion
//#region src/tools/api/send-to-bot.d.ts
declare function sendToBot(ctx: Context, request: SendToBotRequest): Promise<BotSendResult>;
//#endregion
//#region src/tools/api/send-to-pr.d.ts
declare function sendToPr(ctx: Context, request: SendToPrRequest): Promise<PrSendResult>;
//#endregion
//#region src/tools/libs/validate.d.ts
declare function requireBody(body: string): void;
declare function requireRepo(repo: string): [string, string];
declare function requireNumber(number: number): void;
declare function requireSessionId(sessionId: string): void;
declare function requirePath(path: string): asserts path is Path;
//#endregion
//#region src/index.d.ts
interface Role {
  githubJson(path: string, init?: RequestInit): Promise<unknown>;
}
interface Agents {
  get(id: string): {
    readonly id: string;
  } | undefined;
}
interface AgentRuntime {
  prompt(agent: {
    readonly id: string;
  }, prompt: readonly [{
    readonly type: 'text';
    readonly text: string;
  }]): Promise<void>;
}
declare module '@deepseek-ai/cordis' {
  interface Context {
    role: Role;
    agents: Agents;
    agentRuntime: AgentRuntime;
    prChat: PrChat;
  }
  interface Events {
    'pr-chat/path': (event: PathEvent) => void;
    'pr-chat/sent': (event: SentEvent) => void;
  }
}
declare class PrChat extends Service {
  static inject: string[];
  constructor(ctx: Context);
}
//#endregion
export { type BotSendResult, type BotTarget, type Path, type PathEvent, type PrSendResult, type PrTarget, type SendRequest, type SendResult, type SendToBotRequest, type SendToPrRequest, type SentEvent, PrChat as default, requireBody, requireNumber, requirePath, requireRepo, requireSessionId, send, sendToBot, sendToPr };