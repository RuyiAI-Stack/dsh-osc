import { Context, Service } from "@deepseek-ai/cordis";
import * as _deepseek_ai_schemastery0 from "@deepseek-ai/schemastery";
import z from "@deepseek-ai/schemastery";

//#region src/config.d.ts
interface Config {
  secret: string;
}
declare const Config: z<Config>;
//#endregion
//#region src/web/api/webhook.d.ts
interface HookEvent {
  delivery: string;
  event: string;
  payload: unknown;
}
//#endregion
//#region src/web/libs/signature.d.ts
declare class HttpError extends Error {
  readonly status: number;
  constructor(message: string, status: number);
}
declare function verifyGithubSignature(secret: Buffer, body: Buffer, signature: string): boolean;
//#endregion
//#region src/index.d.ts
declare module '@deepseek-ai/cordis' {
  interface Events {
    'hook/github': (event: HookEvent) => void;
  }
}
declare class HookGithub extends Service {
  static inject: string[];
  static Config: _deepseek_ai_schemastery0.default<Config>;
  readonly config: Config;
  constructor(ctx: Context, config: Config);
}
//#endregion
export { type Config, type HookEvent, HttpError, HookGithub as default, verifyGithubSignature };