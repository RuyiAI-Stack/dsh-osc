import { Context, Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";

//#region src/config.d.ts
interface Config {
  token: string;
  botEmail?: string;
}
declare const Config: z<Config>;
//#endregion
//#region src/web/libs/auth.d.ts
declare class HttpError extends Error {
  readonly status: number;
  constructor(message: string, status: number);
}
declare function authorizeZulipBody(body: Record<string, unknown>, expectedToken: string, botEmail?: string): Record<string, unknown>;
//#endregion
//#region src/index.d.ts
declare module '@deepseek-ai/cordis' {
  interface Context {
    hookZulip: HookZulip;
  }
  interface Events {
    'hook/zulip'(payload: Record<string, unknown>): void;
  }
}
declare class HookZulip extends Service {
  static inject: string[];
  static Config: z<Config>;
  readonly config: Config;
  constructor(ctx: Context, config: Config);
}
//#endregion
export { type Config, HttpError, authorizeZulipBody, HookZulip as default };