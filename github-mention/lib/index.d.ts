import { Context, Service } from "@deepseek-ai/cordis";
import * as _deepseek_ai_schemastery0 from "@deepseek-ai/schemastery";
import z from "@deepseek-ai/schemastery";

//#region src/config.d.ts
interface Config {
  /** `hook/github` delivery source this dispatcher accepts. */
  source: string;
  /** App login whose @mention opens a task (`@login` or `@login[bot]`). */
  login: string;
  /** Logins whose own GitHub activity never opens a task (loop prevention). */
  botLogins: string[];
  /** GitHub `owner/repo` → absolute workspace checkout path. */
  workspaces: Record<string, string>;
  /** Agent preset mounted onto every created task Session. */
  agentPreset: string;
  /** Permission preset applied to every created task Session. */
  permissionPreset: string;
}
declare const Config: z<Config>;
//#endregion
//#region src/logic.d.ts
/**
 * Pure mention classification for the github-mention dispatcher.
 * @module dsh-osc-github-mention/logic
 */
/** One GitHub thread the dispatcher may open a task for. */
interface MentionCandidate {
  repo: string;
  kind: 'issue' | 'comment' | 'pr';
  number: number;
  url: string;
  author: string;
  taskText: string;
}
/** Deployment knobs consumed by {@link candidateFrom}. */
interface MentionPolicy {
  login: string;
  botLogins: readonly string[];
  workspaces: Readonly<Record<string, string>>;
}
/** Pattern matching a GitHub mention of `login` in either plain or `[bot]` form. */
declare function mentionPattern(login: string): RegExp;
/** Whether `text` contains an @mention of `login`. */
declare function isMentioned(text: string, login: string): boolean;
/**
 * Extract one actionable @mention candidate from a GitHub webhook payload, or
 * `null` when the delivery does not mention the configured login on a repo the
 * deployment keeps a workspace for.
 */
declare function candidateFrom(eventName: string, payload: unknown, policy: MentionPolicy): MentionCandidate | null;
/** Explicit Session title for one task. */
declare function renderTaskTitle(repo: string, number: number): string;
/** Initial prompt handed to the task Session created for one mention. */
declare function renderTaskPrompt(candidate: MentionCandidate, deliveryId: string): string;
//#endregion
//#region src/index.d.ts
/** Default-exported Cordis plugin/service. */
declare class GithubMention extends Service {
  static inject: string[];
  static Config: _deepseek_ai_schemastery0.default<Config>;
  readonly config: Config;
  private readonly recent;
  constructor(ctx: Context, config: Config);
  private evaluate;
}
declare module '@deepseek-ai/cordis' {
  interface Context {
    githubMention: GithubMention;
  }
}
//#endregion
export { type Config, type MentionCandidate, type MentionPolicy, candidateFrom, GithubMention as default, isMentioned, mentionPattern, renderTaskPrompt, renderTaskTitle };