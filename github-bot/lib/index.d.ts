import { Context, Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import "@deepseek-ai/dsh-tools";

//#region src/config.d.ts
interface OrgConfig {
  appId: number;
  privateKeyFile: string;
  apiBaseUrl?: string;
}
interface Config {
  orgs: Record<string, OrgConfig>;
}
declare const Config: z<Config>;
//#endregion
//#region src/tools/libs/commit.d.ts
declare function assertOrgRepo(input: {
  org: string;
  repo: string;
}, orgs: Record<string, OrgConfig>): OrgConfig;
declare function assertCommitInput(input: {
  org: string;
  repo: string;
  changes: {
    path: string;
    content: string;
  }[];
}, orgs: Record<string, OrgConfig>): OrgConfig;
//#endregion
//#region src/tools/api/commit.d.ts
interface CommitChange {
  path: string;
  content: string;
}
interface CommitInput {
  org: string;
  repo: string;
  base: string;
  branch: string;
  message: string;
  changes: CommitChange[];
}
interface CommitResult {
  commitSha: string;
  branch: string;
  base: string;
  repo: string;
}
declare function commitBranch(config: Config, input: CommitInput): Promise<CommitResult>;
//#endregion
//#region src/tools/api/open-pull-request.d.ts
interface OpenPullRequestInput {
  org: string;
  repo: string;
  base: string;
  head: string;
  title: string;
  body: string;
}
interface OpenPullRequestResult {
  number: number;
  url: string;
  head: string;
  base: string;
  repo: string;
}
declare function openPullRequest(config: Config, input: OpenPullRequestInput): Promise<OpenPullRequestResult>;
//#endregion
//#region src/index.d.ts
declare class GitHubBot extends Service {
  static inject: string[];
  static Config: z<Config>;
  readonly config: Config;
  constructor(ctx: Context, config: Config);
}
declare module '@deepseek-ai/cordis' {
  interface Context {
    githubBot: GitHubBot;
  }
}
//#endregion
export { type CommitChange, type CommitInput, type CommitResult, type Config, type OpenPullRequestInput, type OpenPullRequestResult, type OrgConfig, assertCommitInput, assertOrgRepo, commitBranch, GitHubBot as default, openPullRequest };