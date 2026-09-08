import { Context } from "@deepseek-ai/cordis";

//#region src/web/libs/board.ts
function issueSearchQuery(repo, login) {
	return `repo:${repo} is:issue is:open assignee:${login}`;
}
function prSearchQuery(repo, login) {
	return `repo:${repo} is:pr is:open review-requested:${login}`;
}
function mapSearchItem(raw, kind) {
	const m = String(raw.repository_url).match(/\/repos\/([^/]+\/[^/]+)$/);
	if (!m) throw new Error(`collaboration-panel: bad repository_url ${raw.repository_url}`);
	return {
		repo: m[1],
		kind,
		number: raw.number,
		title: raw.title,
		author: raw.user.login,
		updatedAt: raw.updated_at,
		url: raw.html_url
	};
}
function mapDetail(raw, repo, kind) {
	return {
		repo,
		kind,
		number: raw.number,
		title: raw.title,
		author: raw.user.login,
		updatedAt: raw.updated_at,
		url: raw.html_url,
		state: raw.state,
		body: raw.body == null ? "" : raw.body,
		labels: raw.labels.map((l) => l.name),
		assignees: raw.assignees.map((a) => a.login),
		requestedReviewers: kind === "pr" ? raw.requested_reviewers.map((r) => r.login) : []
	};
}

//#endregion
//#region src/web/libs/items.ts
async function listItems(ctx) {
	const identity = await ctx.role.whoami();
	const permissionErrors = identity.errors;
	const items = [];
	for (const repo of ctx.role.repoList) {
		const permissionError = permissionErrors[repo];
		if (permissionError) {
			items.push({
				repo,
				kind: "error",
				message: permissionError.message
			});
			continue;
		}
		try {
			for (const [kind, q] of [["issue", issueSearchQuery(repo, identity.login)], ["pr", prSearchQuery(repo, identity.login)]]) {
				const body = await ctx.role.githubJson(`/search/issues?q=${encodeURIComponent(q)}&per_page=50`);
				for (const raw of body.items) items.push(mapSearchItem(raw, kind));
			}
		} catch (error) {
			if (!(error instanceof Error) || error.name !== "GitHubHttpError") throw error;
			const status = error.status;
			if (status !== 403 && status !== 404) throw error;
			items.push({
				repo,
				kind: "error",
				message: error.message
			});
		}
	}
	items.sort((a, b) => {
		if (a.kind === "error") return b.kind === "error" ? a.repo.localeCompare(b.repo) : -1;
		if (b.kind === "error") return 1;
		return b.updatedAt.localeCompare(a.updatedAt);
	});
	return items;
}
async function getDetail(ctx, repo, number) {
	if (!ctx.role.repoList.includes(repo)) throw new Error(`collaboration-panel: unknown repo ${repo}`);
	const [owner, name_] = repo.split("/");
	const issue = await ctx.role.githubJson(`/repos/${owner}/${name_}/issues/${number}`);
	if (issue.pull_request) return mapDetail(await ctx.role.githubJson(`/repos/${owner}/${name_}/pulls/${number}`), repo, "pr");
	return mapDetail(issue, repo, "issue");
}

//#endregion
//#region src/web/api/items.ts
function write(res, status, type, body) {
	res.writeHead(status, {
		"content-type": type,
		"cache-control": "no-store"
	});
	res.end(body);
}
async function handleItems(ctx, req, res) {
	try {
		const pathname = new URL(req.url, "http://local").pathname;
		if (pathname === "/integrations/collaboration-panel/items") {
			write(res, 200, "application/json; charset=utf-8", JSON.stringify(await listItems(ctx)));
			return;
		}
		const rest = pathname.slice(40);
		const slash = rest.lastIndexOf("/");
		if (slash <= 0) throw new Error(`collaboration-panel: bad path ${pathname}`);
		const repo = decodeURIComponent(rest.slice(0, slash));
		const number = Number(rest.slice(slash + 1));
		if (!Number.isInteger(number)) throw new Error(`collaboration-panel: bad number ${pathname}`);
		write(res, 200, "application/json; charset=utf-8", JSON.stringify(await getDetail(ctx, repo, number)));
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		write(res, message.includes("not logged in") || message.startsWith("GitHub 401:") ? 401 : 500, "text/plain; charset=utf-8", message);
	}
}

//#endregion
//#region src/index.ts
const name = "collaboration-panel";
const inject = ["role", "webServer"];
function apply(ctx) {
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: "/integrations/collaboration-panel/items",
		handler: (req, res) => void handleItems(ctx, req, res)
	}), "collaboration-panel: api");
}

//#endregion
export { apply, getDetail, inject, issueSearchQuery, listItems, mapDetail, mapSearchItem, name, prSearchQuery };