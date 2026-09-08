import { Context, Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { credentialKey } from "@deepseek-ai/dsh-credentials";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { defineTool } from "@deepseek-ai/dsh-tools";

//#region src/constants.ts
const KEY = credentialKey("role", "github");

//#endregion
//#region src/tools/libs/repo-ref.ts
const SAFE_REPO_SEGMENT = /^[A-Za-z0-9._-]+$/;
function isRepoRef(value) {
	if (typeof value !== "string") return false;
	const parts = value.split("/");
	return parts.length === 2 && parts.every((part) => part !== "." && part !== ".." && SAFE_REPO_SEGMENT.test(part));
}

//#endregion
//#region src/service/repoList.ts
var RepoListStore = class {
	path;
	constructor(dshHome) {
		this.path = join(dshHome, "open-source-collaboration", "repos.json");
		mkdirSync(dirname(this.path), { recursive: true });
		if (!existsSync(this.path)) this.save([]);
	}
	load() {
		const value = JSON.parse(readFileSync(this.path, "utf8"));
		if (!Array.isArray(value)) throw new Error("role: repos file must contain an array: " + this.path);
		for (const repo of value) if (!isRepoRef(repo)) throw new Error("role: bad repo " + String(repo) + "; expected owner/name with safe path segments");
		return value;
	}
	save(repos) {
		writeFileSync(this.path, JSON.stringify(repos, null, 2) + "\n");
	}
};

//#endregion
//#region src/tools/libs/github.ts
var GitHubHttpError = class extends Error {
	status;
	constructor(status, body) {
		super(`GitHub ${status}: ${body}`);
		this.name = "GitHubHttpError";
		this.status = status;
	}
};
function sleep(ms, signal) {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(signal.reason ?? /* @__PURE__ */ new Error("aborted"));
			return;
		}
		const timer = setTimeout(resolve, ms);
		signal?.addEventListener("abort", () => {
			clearTimeout(timer);
			reject(signal.reason ?? /* @__PURE__ */ new Error("aborted"));
		}, { once: true });
	});
}
async function login(role, interaction, signal) {
	const outcome = await role.ctx.authorization.begin({
		key: KEY,
		method: "oauth",
		interaction,
		signal
	});
	if (outcome.status !== "authorized") throw new Error(`role: login ${outcome.status}`);
	const user = await githubJson(role, "/user");
	if (typeof user.login !== "string" || user.login.length === 0) throw new Error("role: /user missing login");
	return { login: user.login };
}
async function githubJson(role, path, init) {
	const accessToken = await githubAccessToken(role);
	const url = `${role.config.apiBaseUrl.replace(/\/+$/, "")}${path}`;
	const headers = new Headers(init?.headers);
	headers.set("Accept", "application/vnd.github+json");
	headers.set("Authorization", `Bearer ${accessToken}`);
	headers.set("X-GitHub-Api-Version", "2022-11-28");
	headers.set("User-Agent", "dsh-role");
	const response = await fetch(url, {
		...init,
		headers
	});
	const text = await response.text();
	if (!response.ok) throw new GitHubHttpError(response.status, text);
	return text.length === 0 ? null : JSON.parse(text);
}
async function githubCloneUrl(role, repo) {
	const accessToken = await githubAccessToken(role);
	const configuredApi = new URL(role.config.apiBaseUrl);
	const configuredOauth = new URL(role.config.oauthBaseUrl);
	const host = configuredOauth.hostname === "github.com" && configuredApi.hostname !== "api.github.com" ? configuredApi.origin : configuredOauth.origin;
	const url = new URL(`${host}/${repo}.git`);
	url.username = "x-access-token";
	url.password = accessToken;
	return url.toString();
}
async function githubAccessToken(role) {
	const record = await role.ctx.credentials.readRecord(KEY);
	if (record === void 0) throw new Error("not logged in");
	if (record.kind !== "grant") throw new Error("role: credential is not a grant");
	const payload = record.payload;
	if (typeof payload?.accessToken !== "string" || payload.accessToken.length === 0) throw new Error("role: grant missing accessToken");
	return payload.accessToken;
}
async function runDeviceFlow(role, session) {
	const base = role.config.oauthBaseUrl.replace(/\/+$/, "");
	const codeResponse = await fetch(`${base}/login/device/code`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			client_id: role.config.clientId,
			scope: role.config.scopes
		}),
		signal: session.signal
	});
	const codeBody = await codeResponse.json();
	if (!codeResponse.ok) throw new Error(`role: device code HTTP ${codeResponse.status}: ${JSON.stringify(codeBody)}`);
	const deviceCode = codeBody.device_code;
	const userCode = codeBody.user_code;
	const verificationUri = codeBody.verification_uri;
	let interval = Number(codeBody.interval ?? 5);
	const expiresIn = Number(codeBody.expires_in);
	if (typeof deviceCode !== "string" || typeof userCode !== "string" || typeof verificationUri !== "string") throw new Error(`role: bad device code response: ${JSON.stringify(codeBody)}`);
	if (!Number.isFinite(interval) || interval <= 0 || !Number.isFinite(expiresIn) || expiresIn <= 0) throw new Error(`role: bad device code timing: ${JSON.stringify(codeBody)}`);
	session.notify({
		message: "Enter this code on the verification page to finish signing in.",
		url: verificationUri,
		code: userCode
	});
	const deadline = Date.now() + expiresIn * 1e3;
	while (Date.now() < deadline) {
		await sleep(interval * 1e3, session.signal);
		const tokenBody = await (await fetch(`${base}/login/oauth/access_token`, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				client_id: role.config.clientId,
				device_code: deviceCode,
				grant_type: "urn:ietf:params:oauth:grant-type:device_code"
			}),
			signal: session.signal
		})).json();
		if (typeof tokenBody.access_token === "string" && tokenBody.access_token.length > 0) {
			await role.ctx.credentials.modifyRecord(KEY, async () => ({
				kind: "grant",
				payload: { accessToken: tokenBody.access_token }
			}));
			return;
		}
		if (tokenBody.error === "authorization_pending") continue;
		if (tokenBody.error === "slow_down") {
			interval += 5;
			continue;
		}
		if (tokenBody.error === "access_denied" || tokenBody.error === "expired_token") throw new Error(`role: device flow ${tokenBody.error}`);
		throw new Error(`role: device flow poll failed: ${JSON.stringify(tokenBody)}`);
	}
	throw new Error("role: device flow expired");
}

//#endregion
//#region src/tools/libs/permissions.ts
function isMaintainer(permission) {
	return permission === "admin" || permission === "maintain";
}
function parsePermission(body) {
	if (body === null || typeof body !== "object") throw new Error("role: permission response is not an object");
	const permission = body.permission;
	if (typeof permission !== "string" || permission.length === 0) throw new Error("role: permission field missing");
	return permission;
}

//#endregion
//#region src/tools/api/whoami.ts
async function whoami(role) {
	const user = await githubJson(role, "/user");
	if (typeof user.login !== "string" || user.login.length === 0) throw new Error("role: /user missing login");
	const maintainers = {};
	const errors = {};
	for (const repo of role.repoList) {
		const [owner, name] = repo.split("/");
		try {
			maintainers[repo] = isMaintainer(parsePermission(await githubJson(role, `/repos/${owner}/${name}/collaborators/${user.login}/permission`)));
		} catch (error) {
			if (!(error instanceof GitHubHttpError) || error.status !== 403 && error.status !== 404) throw error;
			errors[repo] = {
				status: error.status,
				message: error.message
			};
		}
	}
	return {
		login: user.login,
		maintainers,
		errors
	};
}
function defineWhoamiTool(role) {
	return defineTool({
		name: "role_whoami",
		description: "Return GitHub login and maintainer map for configured repos. Throws if not logged in.",
		parameters: {},
		output: {
			schema: {
				type: "object",
				properties: {
					login: {
						type: "string",
						required: true
					},
					maintainers: {
						type: "json",
						required: true
					},
					errors: {
						type: "json",
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
		execute: async () => whoami(role)
	});
}

//#endregion
//#region src/web/api/login.ts
async function handleLogin(login$1, req, res) {
	if (req.method !== "POST") {
		res.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
		res.end("POST only");
		return;
	}
	res.writeHead(200, {
		"content-type": "text/event-stream; charset=utf-8",
		"cache-control": "no-store",
		connection: "keep-alive"
	});
	const send = (event, data) => {
		res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
	};
	const ac = new AbortController();
	req.on("close", () => ac.abort());
	try {
		const { login: userLogin } = await login$1({
			notify: (n) => send("notice", n),
			prompt: async () => {
				throw new Error("role: device flow does not prompt");
			}
		}, ac.signal);
		send("done", { login: userLogin });
	} catch (err) {
		send("error", { message: err instanceof Error ? err.message : String(err) });
	}
	res.end();
}

//#endregion
//#region src/web/api/repos.ts
async function handleRepos(store, req, res) {
	try {
		if (req.method === "GET") {
			res.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
				"cache-control": "no-store"
			});
			res.end(JSON.stringify(store.load()));
			return;
		}
		if (req.method !== "POST" && req.method !== "PUT" && req.method !== "DELETE") {
			res.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
			res.end("method not allowed");
			return;
		}
		const chunks = [];
		for await (const chunk of req) chunks.push(Buffer.from(chunk));
		const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
		if (!isRepoRef(body.repo)) throw new Error("role: bad repo " + String(body.repo) + "; expected owner/name with safe path segments");
		const repos = store.load();
		if (req.method === "DELETE") store.save(repos.filter((repo) => repo !== body.repo));
		else if (!repos.includes(body.repo)) store.save([...repos, body.repo]);
		res.writeHead(200, {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store"
		});
		res.end(JSON.stringify(store.load()));
	} catch (err) {
		res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
		res.end(err instanceof Error ? err.message : String(err));
	}
}

//#endregion
//#region src/index.ts
var Role = class extends Service {
	static inject = [
		"tools",
		"authorization",
		"credentials",
		"webServer"
	];
	static Config = z.object({
		clientId: z.string().default("Ov23lixMRqTArZkZ92EI"),
		scopes: z.string().default("read:user repo"),
		apiBaseUrl: z.string().default("https://api.github.com"),
		oauthBaseUrl: z.string().default("https://github.com")
	});
	config;
	repos;
	get repoList() {
		return this.repos.load();
	}
	constructor(ctx, config) {
		super(ctx, "role");
		this.config = config;
		const dshHome = process.env.DSH_HOME;
		if (!dshHome) throw new Error("role: DSH_HOME required");
		this.repos = new RepoListStore(dshHome);
		ctx.authorization.registerFlow({
			key: KEY,
			label: "GitHub (role)",
			methods: [{
				id: "oauth",
				label: "Sign in with GitHub"
			}],
			run: async (session) => runDeviceFlow(this, session)
		});
		ctx.tools.register(defineWhoamiTool(this));
		ctx.effect(() => ctx.webServer.register({
			kind: "exact",
			path: "/integrations/role/login",
			handler: (req, res) => void handleLogin(this.login.bind(this), req, res)
		}), "role: login");
		ctx.effect(() => ctx.webServer.register({
			kind: "exact",
			path: "/integrations/role/repos",
			handler: (req, res) => void handleRepos(this.repos, req, res)
		}), "role: repos");
	}
	async login(interaction, signal) {
		return login(this, interaction, signal);
	}
	async whoami() {
		return whoami(this);
	}
	async githubJson(path, init) {
		return githubJson(this, path, init);
	}
	async githubCloneUrl(repo) {
		return githubCloneUrl(this, repo);
	}
};

//#endregion
export { KEY, RepoListStore, Role as default, githubCloneUrl, githubJson, isMaintainer, isRepoRef, login, parsePermission, whoami };