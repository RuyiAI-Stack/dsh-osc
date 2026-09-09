import { Context, Service } from "@deepseek-ai/cordis";
import * as _deepseek_ai_schemastery0 from "@deepseek-ai/schemastery";
import z from "@deepseek-ai/schemastery";

//#region src/config.d.ts
interface Config {
  /** `hook/github` delivery source this dispatcher accepts. */
  source: string;
  /** GitHub `owner/repo` this rule acts on. */
  repository: string;
  /** GitHub `owner/repo` → absolute workspace checkout path. */
  workspaces: Record<string, string>;
  /** Agent preset mounted onto every created task Session. */
  agentPreset: string;
  /** Permission preset applied to every created task Session. */
  permissionPreset: string;
  /** Maximum auto-fix Sessions per PR before escalating to a maintainer. */
  maxIterations: number;
}
declare const Config: z<Config>;
//#endregion
//#region src/index.d.ts

declare class GithubCiContinuation extends Service {
  static inject: string[];
  static Config: _deepseek_ai_schemastery0.default<Config>;
  readonly config: Config;
  private readonly recent;
  private readonly verdicts;
  private readonly attempts;
  constructor(ctx: Context, config: Config);
  private evaluate;
}
declare module '@deepseek-ai/cordis' {
  interface Context {
    githubCiContinuation: GithubCiContinuation;
  }
}
//#endregion
export { GithubCiContinuation as default };