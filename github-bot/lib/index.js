import { Context, Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { isRepoRef } from "@ruyiAi/dsh-osc-role";
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

//#region src/config.ts
const Config = z.object({ orgs: z.dict(z.object({
	appId: z.number(),
	privateKeyFile: z.string(),
	apiBaseUrl: z.string().default("https://api.github.com")
})) });

//#endregion
//#region src/tools/libs/commit.ts
function assertOrgRepo(input, orgs) {
	if (!isRepoRef(input.repo)) throw new Error("github-bot: repo must be in owner/name form");
	const orgConfig = orgs[input.org];
	if (!orgConfig) throw new Error(`github-bot: unknown org ${input.org}`);
	return orgConfig;
}
function assertCommitInput(input, orgs) {
	const orgConfig = assertOrgRepo(input, orgs);
	if (!input.changes?.length) throw new Error("github-bot: changes must not be empty");
	return orgConfig;
}

//#endregion
//#region src/tools/libs/token.ts
function readPrivateKey(path) {
	if (!path) throw new Error("github-bot: privateKeyFile is required");
	try {
		const pem = readFileSync(path, "utf8");
		if (!pem) throw new Error("private key file is empty");
		return pem;
	} catch (error) {
		throw new Error(`github-bot: cannot read private key file ${path}`, { cause: error });
	}
}
function createAppJwt(appId, pem) {
	const now = Math.floor(Date.now() / 1e3);
	const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
	const signingInput = `${encode({
		alg: "RS256",
		typ: "JWT"
	})}.${encode({
		iat: now - 60,
		exp: now + 540,
		iss: appId
	})}`;
	return `${signingInput}.${createSign("RSA-SHA256").update(signingInput).end().sign(pem).toString("base64url")}`;
}
function apiHeaders(jwt) {
	return {
		accept: "application/vnd.github+json",
		authorization: `Bearer ${jwt}`,
		"x-github-api-version": "2022-11-28"
	};
}
function nextPage(link) {
	if (!link) return void 0;
	for (const part of link.split(",")) {
		const match = part.trim().match(/^<([^>]+)>;\s*rel="next"$/);
		if (match) return match[1];
	}
}
async function resolveInstallationId(org, config) {
	const jwt = createAppJwt(config.appId, readPrivateKey(config.privateKeyFile));
	let url = `${config.apiBaseUrl ?? "https://api.github.com"}/app/installations?per_page=100`;
	const want = org.toLowerCase();
	while (url) {
		const response = await fetch(url, { headers: apiHeaders(jwt) });
		const body = await response.text();
		if (!response.ok) throw new Error(`github-bot: GitHub API ${response.status}: ${body}`);
		const list = JSON.parse(body);
		for (const row of list) {
			const login = row.account?.login;
			if (typeof login === "string" && login.toLowerCase() === want) return row.id;
		}
		url = nextPage(response.headers.get("link"));
	}
	throw new Error(`github-bot: no installation for org ${org}`);
}
async function createInstallationToken(org, config) {
	const installationId = await resolveInstallationId(org, config);
	const jwt = createAppJwt(config.appId, readPrivateKey(config.privateKeyFile));
	const response = await fetch(`${config.apiBaseUrl ?? "https://api.github.com"}/app/installations/${installationId}/access_tokens`, {
		method: "POST",
		headers: apiHeaders(jwt)
	});
	const body = await response.text();
	if (!response.ok) throw new Error(`github-bot: GitHub API ${response.status}: ${body}`);
	const result = JSON.parse(body);
	return {
		token: result.token,
		expiresAt: result.expires_at
	};
}

//#endregion
//#region src/tools/libs/api.ts
async function githubRequest(config, token, path, init) {
	const headers = new Headers(init?.headers);
	headers.set("accept", "application/vnd.github+json");
	headers.set("authorization", `Bearer ${token}`);
	headers.set("content-type", "application/json");
	headers.set("x-github-api-version", "2022-11-28");
	const response = await fetch(`${config.apiBaseUrl ?? "https://api.github.com"}${path}`, {
		...init,
		headers
	});
	const text = await response.text();
	if (!response.ok) throw new Error(`github-bot: GitHub API ${response.status}: ${text}`);
	return text.length === 0 ? null : JSON.parse(text);
}

//#endregion
//#region src/tools/api/commit.ts
async function commitBranch(config, input) {
	const orgConfig = assertCommitInput(input, config.orgs);
	const [owner, repo] = input.repo.split("/");
	const { token } = await createInstallationToken(input.org, orgConfig);
	const request = (path, init) => githubRequest(orgConfig, token, path, init);
	const branchPath = `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(input.branch)}`;
	try {
		const branchRef = await request(branchPath);
		throw new Error(`github-bot: branch ${input.branch} already exists at ${branchRef.object.sha}; use a unique branch name`);
	} catch (error) {
		if (!(error instanceof Error) || !error.message.startsWith("github-bot: GitHub API 404:")) throw error;
	}
	const parentSha = (await request(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(input.base)}`)).object.sha;
	const parent = await request(`/repos/${owner}/${repo}/git/commits/${parentSha}`);
	const blobs = await Promise.all(input.changes.map(async (change) => {
		const blob = await request(`/repos/${owner}/${repo}/git/blobs`, {
			method: "POST",
			body: JSON.stringify({
				content: change.content,
				encoding: "utf-8"
			})
		});
		return {
			path: change.path,
			mode: "100644",
			type: "blob",
			sha: blob.sha
		};
	}));
	const tree = await request(`/repos/${owner}/${repo}/git/trees`, {
		method: "POST",
		body: JSON.stringify({
			base_tree: parent.tree.sha,
			tree: blobs
		})
	});
	const commit = await request(`/repos/${owner}/${repo}/git/commits`, {
		method: "POST",
		body: JSON.stringify({
			message: input.message,
			tree: tree.sha,
			parents: [parentSha]
		})
	});
	await request(`/repos/${owner}/${repo}/git/refs`, {
		method: "POST",
		body: JSON.stringify({
			ref: `refs/heads/${input.branch}`,
			sha: commit.sha
		})
	});
	return {
		commitSha: commit.sha,
		branch: input.branch,
		base: input.base,
		repo: input.repo
	};
}
function defineCommitTool(bot) {
	return defineTool({
		name: "github_bot_commit",
		description: "Commit file changes onto a new branch with the configured GitHub App.",
		parameters: {
			org: {
				type: "string",
				required: true
			},
			repo: {
				type: "string",
				required: true,
				description: "Repository in owner/name form."
			},
			base: {
				type: "string",
				required: true
			},
			branch: {
				type: "string",
				required: true
			},
			message: {
				type: "string",
				required: true
			},
			changes: {
				type: "array",
				required: true,
				items: {
					type: "object",
					properties: {
						path: {
							type: "string",
							required: true
						},
						content: {
							type: "string",
							required: true
						}
					},
					additionalProperties: false
				}
			}
		},
		output: {
			schema: {
				type: "object",
				properties: {
					commitSha: {
						type: "string",
						required: true
					},
					branch: {
						type: "string",
						required: true
					},
					base: {
						type: "string",
						required: true
					},
					repo: {
						type: "string",
						required: true
					}
				},
				additionalProperties: false
			},
			render: (_args, value) => [{
				type: "text",
				text: JSON.stringify(value)
			}]
		},
		execute: async (args) => commitBranch(bot.config, args)
	});
}

//#endregion
//#region src/tools/api/open-pull-request.ts
async function openPullRequest(config, input) {
	const orgConfig = assertOrgRepo(input, config.orgs);
	const [owner, repo] = input.repo.split("/");
	const { token } = await createInstallationToken(input.org, orgConfig);
	const pull = await githubRequest(orgConfig, token, `/repos/${owner}/${repo}/pulls`, {
		method: "POST",
		body: JSON.stringify({
			title: input.title,
			body: input.body,
			head: input.head,
			base: input.base
		})
	});
	return {
		number: pull.number,
		url: pull.html_url,
		head: input.head,
		base: input.base,
		repo: input.repo
	};
}
function defineOpenPullRequestTool(bot) {
	return defineTool({
		name: "github_bot_open_pull_request",
		description: "Open a pull request for an existing head branch. Use after github_bot_commit (or any existing branch).",
		parameters: {
			org: {
				type: "string",
				required: true
			},
			repo: {
				type: "string",
				required: true,
				description: "Repository in owner/name form."
			},
			base: {
				type: "string",
				required: true
			},
			head: {
				type: "string",
				required: true,
				description: "Head branch name."
			},
			title: {
				type: "string",
				required: true
			},
			body: {
				type: "string",
				required: true
			}
		},
		output: {
			schema: {
				type: "object",
				properties: {
					number: {
						type: "number",
						required: true
					},
					url: {
						type: "string",
						required: true
					},
					head: {
						type: "string",
						required: true
					},
					base: {
						type: "string",
						required: true
					},
					repo: {
						type: "string",
						required: true
					}
				},
				additionalProperties: false
			},
			render: (_args, value) => [{
				type: "text",
				text: JSON.stringify(value)
			}]
		},
		execute: async (args) => openPullRequest(bot.config, args)
	});
}

//#endregion
//#region src/index.ts
var GitHubBot = class extends Service {
	static inject = ["tools"];
	static Config = Config;
	constructor(ctx, config) {
		super(ctx, "githubBot");
		this.config = config;
		ctx.tools.register(defineCommitTool(this));
		ctx.tools.register(defineOpenPullRequestTool(this));
	}
};

//#endregion
export { assertCommitInput, assertOrgRepo, commitBranch, GitHubBot as default, openPullRequest };