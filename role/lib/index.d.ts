import { Context, Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import * as _deepseek_ai_dsh_credentials0 from "@deepseek-ai/dsh-credentials";
import "@deepseek-ai/dsh-tools";
import { AuthorizationInteraction } from "@deepseek-ai/dsh-authorization";

//#region src/config.d.ts
interface Config {
  clientId: string;
  scopes: string;
  apiBaseUrl: string;
  oauthBaseUrl: string;
}
//#endregion
//#region src/tools/libs/github.d.ts
interface RoleHost {
  readonly ctx: Context;
  readonly config: Config;
  readonly repoList: readonly string[];
}
declare function login(role: RoleHost, interaction: AuthorizationInteraction, signal?: AbortSignal): Promise<{
  login: string;
}>;
declare function githubJson(role: RoleHost, path: string, init?: RequestInit): Promise<unknown>;
declare function githubCloneUrl(role: RoleHost, repo: string): Promise<string>;
//#endregion
//#region src/tools/api/whoami.d.ts
interface WhoamiResult {
  login: string;
  maintainers: Record<string, boolean>;
  errors: Record<string, {
    status: number;
    message: string;
  }>;
}
declare function whoami(role: RoleHost): Promise<WhoamiResult>;
//#endregion
//#region src/constants.d.ts
declare const KEY: _deepseek_ai_dsh_credentials0.CredentialKey;
//#endregion
//#region src/tools/libs/repo-ref.d.ts
declare function isRepoRef(value: unknown): value is string;
//#endregion
//#region src/tools/libs/permissions.d.ts
declare function isMaintainer(permission: string): boolean;
declare function parsePermission(body: unknown): string;
//#endregion
//#region src/service/repoList.d.ts
declare class RepoListStore {
  readonly path: string;
  constructor(dshHome: string);
  load(): string[];
  save(repos: string[]): void;
}
//#endregion
//#region src/index.d.ts
declare module '@deepseek-ai/cordis' {
  interface Context {
    role: Role;
  }
}
declare class Role extends Service {
  static inject: string[];
  static Config: z<Config>;
  readonly config: Config;
  private readonly repos;
  get repoList(): readonly string[];
  constructor(ctx: Context, config: Config);
  login(interaction: AuthorizationInteraction, signal?: AbortSignal): Promise<{
    login: string;
  }>;
  whoami(): Promise<WhoamiResult>;
  githubJson(path: string, init?: RequestInit): Promise<unknown>;
  githubCloneUrl(repo: string): Promise<string>;
}
//#endregion
export { type Config, KEY, RepoListStore, type RoleHost, type WhoamiResult, Role as default, githubCloneUrl, githubJson, isMaintainer, isRepoRef, login, parsePermission, whoami };