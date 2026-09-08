import { Context } from "@deepseek-ai/cordis";

//#region src/web/libs/board.d.ts
type Kind = 'issue' | 'pr';
interface BoardItem {
  repo: string;
  kind: Kind;
  number: number;
  title: string;
  author: string;
  updatedAt: string;
  url: string;
}
interface BoardError {
  repo: string;
  kind: 'error';
  message: string;
}
type BoardEntry = BoardItem | BoardError;
interface BoardDetail extends BoardItem {
  state: string;
  body: string;
  labels: string[];
  assignees: string[];
  requestedReviewers: string[];
}
declare function issueSearchQuery(repo: string, login: string): string;
declare function prSearchQuery(repo: string, login: string): string;
declare function mapSearchItem(raw: any, kind: Kind): BoardItem;
declare function mapDetail(raw: any, repo: string, kind: Kind): BoardDetail;
//#endregion
//#region src/web/libs/items.d.ts
declare function listItems(ctx: Context): Promise<BoardEntry[]>;
declare function getDetail(ctx: Context, repo: string, number: number): Promise<BoardDetail>;
//#endregion
//#region src/index.d.ts
declare const name = "collaboration-panel";
declare const inject: string[];
declare function apply(ctx: Context): void;
//#endregion
export { type BoardDetail, type BoardEntry, type BoardError, type BoardItem, type Kind, apply, getDetail, inject, issueSearchQuery, listItems, mapDetail, mapSearchItem, name, prSearchQuery };